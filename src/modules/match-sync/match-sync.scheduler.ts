import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { MatchSyncService } from "./match-sync.service";
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
    this.syncEnabled =
      this.configService.get<string>("MATCH_SYNC_ENABLED") === "true";
    this.sync24hEnabled =
      this.configService.get<string>("MATCH_SYNC_24H_ENABLED") === "true";
    this.syncWeeklyEnabled =
      this.configService.get<string>("MATCH_SYNC_WEEKLY_ENABLED") === "true";
    this.syncMonthlyEnabled =
      this.configService.get<string>("MATCH_SYNC_MONTHLY_ENABLED") === "true";
    this.sync24hIntervalMs = parseInt(
      this.configService.get<string>("MATCH_SYNC_24H_INTERVAL_MS") || "7200000",
      10,
    );
    this.syncWeeklyIntervalMs = parseInt(
      this.configService.get<string>("MATCH_SYNC_WEEKLY_INTERVAL_MS") ||
        "21600000",
      10,
    );
    this.syncMonthlyIntervalMs = parseInt(
      this.configService.get<string>("MATCH_SYNC_MONTHLY_INTERVAL_MS") ||
        "43200000",
      10,
    );
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
      this.disableAllCronJobs();
    } else {
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
    } catch (error) {}
  }
  @Interval(7200000)
  async sync24HourMatches() {
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
  @Interval(21600000)
  async syncWeeklyMatches() {
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
  @Interval(43200000)
  async syncMonthlyMatches() {
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
