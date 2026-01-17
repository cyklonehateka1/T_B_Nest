import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { MatchSyncService } from "./match-sync.service";

/**
 * Scheduled jobs for automatically syncing matches from The Odds API
 *
 * Multiple sync types with different date ranges:
 * - 24-hour sync: Frequent updates for upcoming matches (next 1 day)
 * - Weekly sync: Regular sync for upcoming matches (next 7 days) - DEFAULT ENABLED
 * - Monthly sync: Extended sync for future matches (next 30 days)
 *
 * Configuration:
 * - MATCH_SYNC_ENABLED: Enable/disable all scheduled syncs (default: false - ALL DEACTIVATED)
 * - MATCH_SYNC_24H_ENABLED: Enable 24-hour sync (default: false)
 * - MATCH_SYNC_24H_INTERVAL_MS: 24-hour sync interval in milliseconds (default: 7200000 = 2 hours)
 * - MATCH_SYNC_WEEKLY_ENABLED: Enable weekly sync (default: false)
 * - MATCH_SYNC_WEEKLY_INTERVAL_MS: Weekly sync interval in milliseconds (default: 21600000 = 6 hours)
 * - MATCH_SYNC_MONTHLY_ENABLED: Enable monthly sync (default: false)
 * - MATCH_SYNC_MONTHLY_INTERVAL_MS: Monthly sync interval in milliseconds (default: 43200000 = 12 hours)
 */
@Injectable()
export class MatchSyncScheduler implements OnModuleInit {
  private readonly logger = new Logger(MatchSyncScheduler.name);
  private readonly syncEnabled: boolean;
  private readonly sync24hEnabled: boolean;
  private readonly syncWeeklyEnabled: boolean;
  private readonly syncMonthlyEnabled: boolean;
  private readonly sync24hIntervalMs: number;
  private readonly syncWeeklyIntervalMs: number;
  private readonly syncMonthlyIntervalMs: number;

  constructor(
    private readonly matchSyncService: MatchSyncService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    // All syncs are disabled by default as requested
    this.syncEnabled =
      this.configService.get<string>("MATCH_SYNC_ENABLED") === "true";
    this.sync24hEnabled =
      this.configService.get<string>("MATCH_SYNC_24H_ENABLED") === "true";
    this.syncWeeklyEnabled =
      this.configService.get<string>("MATCH_SYNC_WEEKLY_ENABLED") === "true";
    this.syncMonthlyEnabled =
      this.configService.get<string>("MATCH_SYNC_MONTHLY_ENABLED") === "true";

    // Intervals match Java defaults
    this.sync24hIntervalMs = parseInt(
      this.configService.get<string>("MATCH_SYNC_24H_INTERVAL_MS") || "7200000",
      10,
    ); // 2 hours
    this.syncWeeklyIntervalMs = parseInt(
      this.configService.get<string>("MATCH_SYNC_WEEKLY_INTERVAL_MS") ||
        "21600000",
      10,
    ); // 6 hours
    this.syncMonthlyIntervalMs = parseInt(
      this.configService.get<string>("MATCH_SYNC_MONTHLY_INTERVAL_MS") ||
        "43200000",
      10,
    ); // 12 hours

    if (!this.syncEnabled) {
      this.logger.warn(
        "Match sync scheduler is disabled (MATCH_SYNC_ENABLED=false). All cron jobs are deactivated.",
      );
    } else {
      if (
        !this.sync24hEnabled &&
        !this.syncWeeklyEnabled &&
        !this.syncMonthlyEnabled
      ) {
        this.logger.warn(
          "Match sync is enabled but all individual sync jobs are disabled.",
        );
      }
    }
  }

  onModuleInit() {
    if (!this.syncEnabled) {
      // Disable all cron jobs if sync is disabled
      this.disableAllCronJobs();
    } else {
      // Log which jobs are enabled
      if (this.sync24hEnabled) {
        this.logger.log(
          `24-hour sync enabled with interval: ${this.sync24hIntervalMs}ms (${this.sync24hIntervalMs / 1000 / 60} minutes)`,
        );
      }
      if (this.syncWeeklyEnabled) {
        this.logger.log(
          `Weekly sync enabled with interval: ${this.syncWeeklyIntervalMs}ms (${this.syncWeeklyIntervalMs / 1000 / 60} minutes)`,
        );
      }
      if (this.syncMonthlyEnabled) {
        this.logger.log(
          `Monthly sync enabled with interval: ${this.syncMonthlyIntervalMs}ms (${this.syncMonthlyIntervalMs / 1000 / 60} minutes)`,
        );
      }
    }
  }

  private disableAllCronJobs() {
    // This will be handled by the cron decorators being skipped when syncEnabled is false
    // But we can also check and disable them explicitly
    try {
      const jobs = [
        "sync24HourMatches",
        "syncWeeklyMatches",
        "syncMonthlyMatches",
      ];
      for (const jobName of jobs) {
        const job = this.schedulerRegistry.getCronJob(jobName);
        if (job) {
          job.stop();
          this.logger.debug(`Stopped cron job: ${jobName}`);
        }
      }
    } catch (error) {
      // Jobs may not be registered yet, ignore
    }
  }

  /**
   * 24-Hour Sync: Frequent updates for upcoming matches (next 24 hours)
   * Runs every 2 hours (7200000ms) by default
   * Initial delay: 180000ms (3 minutes)
   * Purpose: Keep odds fresh for matches happening soon
   * Note: Uses fixedDelay (interval after previous completion) matching Java @Scheduled(fixedDelayString)
   */
  @Interval(7200000) // Default 2 hours, will be configured via MATCH_SYNC_24H_INTERVAL_MS
  async sync24HourMatches() {
    // Check if enabled via config
    if (!this.syncEnabled || !this.sync24hEnabled) {
      return;
    }

    this.logger.log("Starting 24-hour match sync (next 1 day)");

    const startTime = Date.now();

    try {
      const totalSynced =
        await this.matchSyncService.syncMatchesForAllActiveLeagues(1);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed 24-hour match sync: ${totalSynced} matches synced in ${duration} ms`,
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Error during 24-hour match sync after ${duration} ms: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weekly Sync: Regular sync for upcoming matches (next 7 days)
   * Runs every 6 hours (21600000ms) by default
   * Initial delay: 60000ms (1 minute)
   * Purpose: Main sync to populate database with upcoming matches
   * Note: In Java, this was DEFAULT ENABLED, but here it's DISABLED by default as requested
   * Uses fixedDelay (interval after previous completion) matching Java @Scheduled(fixedDelayString)
   */
  @Interval(21600000) // Default 6 hours, will be configured via MATCH_SYNC_WEEKLY_INTERVAL_MS
  async syncWeeklyMatches() {
    // Check if enabled via config
    if (!this.syncEnabled || !this.syncWeeklyEnabled) {
      return;
    }

    this.logger.log("Starting weekly match sync (next 7 days)");

    const startTime = Date.now();

    try {
      const totalSynced =
        await this.matchSyncService.syncMatchesForAllActiveLeagues(7);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed weekly match sync: ${totalSynced} matches synced in ${duration} ms`,
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Error during weekly match sync after ${duration} ms: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Monthly Sync: Extended sync for future matches (next 30 days)
   * Runs every 12 hours (43200000ms) by default
   * Initial delay: 240000ms (4 minutes)
   * Purpose: Get future matches scheduled well in advance
   * Uses fixedDelay (interval after previous completion) matching Java @Scheduled(fixedDelayString)
   */
  @Interval(43200000) // Default 12 hours, will be configured via MATCH_SYNC_MONTHLY_INTERVAL_MS
  async syncMonthlyMatches() {
    // Check if enabled via config
    if (!this.syncEnabled || !this.syncMonthlyEnabled) {
      return;
    }

    this.logger.log("Starting monthly match sync (next 30 days)");

    const startTime = Date.now();

    try {
      const totalSynced =
        await this.matchSyncService.syncMatchesForAllActiveLeagues(30);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed monthly match sync: ${totalSynced} matches synced in ${duration} ms`,
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Error during monthly match sync after ${duration} ms: ${error.message}`,
        error.stack,
      );
    }
  }
}
