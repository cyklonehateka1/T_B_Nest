import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppSettings } from "../../../common/entities/app-settings.entity";
import { CompetitionType } from "../../../common/enums/competition-type.enum";
import { MatchSelectionService } from "../services/match-selection.service";
import { AiTipGenerationService } from "../services/ai-tip-generation.service";

@Injectable()
export class WeekendLeagueTipsScheduler implements OnModuleInit {
  private readonly logger = new Logger(WeekendLeagueTipsScheduler.name);
  private readonly cronEnabled: boolean;
  private hasRunOnStartup = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AppSettings)
    private readonly appSettingsRepository: Repository<AppSettings>,
    private readonly matchSelectionService: MatchSelectionService,
    private readonly aiTipGenerationService: AiTipGenerationService,
  ) {
    this.cronEnabled =
      this.configService.get<string>("AI_TIP_GENERATION_CRON_ENABLED") ===
      "true";
  }

  async onModuleInit() {
    this.logger.log("=== Weekend League Tips Scheduler Initialization ===");
    this.logger.log(
      `AI_TIP_GENERATION_CRON_ENABLED: ${this.cronEnabled}`,
    );

    if (!this.cronEnabled) {
      this.logger.warn(
        "AI tip generation cron is disabled. Weekend tips will not be generated.",
      );
      return;
    }

    // Run immediately on startup for testing
    this.logger.log(
      "Running weekend tips generation immediately on startup (for testing)...",
    );
    setTimeout(() => {
      this.generateWeekendTips(true).catch((error) => {
        this.logger.error(
          `Error during startup weekend tips generation: ${error.message}`,
          error.stack,
        );
      });
    }, 10000); // Wait 10 seconds for app to fully initialize

    this.logger.log(
      "✓ Weekend tips scheduler enabled - will run every Thursday at 6 PM and on startup",
    );
    this.logger.log(
      "=== Weekend League Tips Scheduler Initialization Complete ===",
    );
  }

  /**
   * Generate weekend tips - runs Thursday 6 PM
   */
  @Cron("0 18 * * 4") // Thursday 6 PM
  async generateWeekendTipsScheduled(): Promise<void> {
    if (!this.cronEnabled) {
      return;
    }

    await this.generateWeekendTips(false);
  }

  /**
   * Generate weekend tips
   * @param isStartupRun - Whether this is running on startup (for testing)
   */
  private async generateWeekendTips(isStartupRun: boolean): Promise<void> {
    if (isStartupRun && this.hasRunOnStartup) {
      this.logger.debug("Startup run already completed, skipping");
      return;
    }

    try {
      // Check if AI generation is enabled in AppSettings
      const appSettings = await this.appSettingsRepository.findOne({
        where: { isActive: true },
      });

      if (
        appSettings?.metadata &&
        appSettings.metadata.aiTipGenerationEnabled === false
      ) {
        this.logger.debug(
          "AI tip generation disabled in AppSettings",
        );
        return;
      }

      // Get weekend date range (Friday to Sunday)
      // For startup/testing: include matches from today onwards
      let start: Date;
      let end: Date;

      if (isStartupRun) {
        // For testing: include matches from today to 3 days ahead
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() + 3);
        end.setHours(23, 59, 59, 999);
        this.logger.log(
          `[TEST MODE] Using flexible date range for testing: ${start.toISOString()} to ${end.toISOString()}`,
        );
      } else {
        // Normal operation: Friday to Sunday
        const range = this.matchSelectionService.getWeekendDateRange();
        start = range.start;
        end = range.end;
      }

      this.logger.log(
        `Generating weekend tips for ${start.toISOString()} to ${end.toISOString()}${isStartupRun ? " (startup run)" : ""}`,
      );

      // Select matches
      const matches = await this.matchSelectionService.selectWeekendLeagueMatches(
        start,
        end,
      );

      if (matches.length === 0) {
        this.logger.warn(
          "No eligible matches found for weekend tips. This might be normal if it's not yet Thursday or no matches are scheduled.",
        );
        if (isStartupRun) {
          this.hasRunOnStartup = true;
        }
        return;
      }

      this.logger.log(
        `Selected ${matches.length} matches for weekend tips generation`,
      );

      // Generate tip
      const result = await this.aiTipGenerationService.generateTipForMatches(
        matches,
        {
          competitionType: CompetitionType.WEEKEND_LEAGUE,
          titleTemplate: "Weekend Acca",
          autoPublish: true,
          batchId: `weekend-${Date.now()}`,
        },
      );

      if (result) {
        this.logger.log(
          `✅ Weekend tip generated successfully! Tip ID: ${result.tip.id}, Title: "${result.tip.title}", Latency: ${result.latency}ms`,
        );
        this.logger.log(
          `   - Selections: ${matches.length} matches`,
          `   - Total Odds: ${result.tip.totalOdds || "N/A"}`,
          `   - Published: ${result.tip.isPublished}`,
        );
      } else {
        this.logger.warn("Weekend tip generation returned null");
      }

      if (isStartupRun) {
        this.hasRunOnStartup = true;
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate weekend tips: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
