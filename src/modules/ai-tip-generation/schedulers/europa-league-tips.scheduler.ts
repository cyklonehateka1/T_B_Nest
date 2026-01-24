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
export class EuropaLeagueTipsScheduler implements OnModuleInit {
  private readonly logger = new Logger(EuropaLeagueTipsScheduler.name);
  private readonly cronEnabled: boolean;

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
    this.logger.log("=== Europa League Tips Scheduler Initialization ===");
    this.logger.log(
      `AI_TIP_GENERATION_CRON_ENABLED: ${this.cronEnabled}`,
    );

    if (!this.cronEnabled) {
      this.logger.warn(
        "AI tip generation cron is disabled. Europa League tips will not be generated.",
      );
      return;
    }

    this.logger.log(
      "✓ Europa League tips scheduler enabled - will run on matchdays",
    );
    this.logger.log(
      "=== Europa League Tips Scheduler Initialization Complete ===",
    );
  }

  /**
   * Generate Europa League tips - runs Monday before matchday
   */
  @Cron("0 19 * * 1") // Monday 7 PM (1 hour after Champions League)
  async generateEuropaLeagueTips(): Promise<void> {
    if (!this.cronEnabled) {
      return;
    }

    try {
      // Check if AI generation is enabled
      const appSettings = await this.appSettingsRepository.findOne({
        where: { isActive: true },
      });

      if (
        appSettings?.metadata &&
        appSettings.metadata.aiTipGenerationEnabled === false
      ) {
        this.logger.debug("AI tip generation disabled in AppSettings");
        return;
      }

      // Get date range: next 3 days
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 3);
      endDate.setHours(23, 59, 59, 999);

      this.logger.log(
        `Generating Europa League tips for ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      // Select matches
      const matches =
        await this.matchSelectionService.selectEuropaLeagueMatches(
          startDate,
          endDate,
        );

      if (matches.length === 0) {
        this.logger.debug("No Europa League matches found in date range");
        return;
      }

      this.logger.log(
        `Selected ${matches.length} Europa League matches for tip generation`,
      );

      // Generate tip
      const result = await this.aiTipGenerationService.generateTipForMatches(
        matches,
        {
          competitionType: CompetitionType.EUROPA_LEAGUE,
          titleTemplate: "Europa League Picks",
          autoPublish: true,
          batchId: `uel-${Date.now()}`,
        },
      );

      if (result) {
        this.logger.log(
          `✅ Europa League tip generated successfully! Tip ID: ${result.tip.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate Europa League tips: ${error.message}`,
        error.stack,
      );
    }
  }
}
