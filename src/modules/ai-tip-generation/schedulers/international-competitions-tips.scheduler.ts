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
export class InternationalCompetitionsTipsScheduler implements OnModuleInit {
  private readonly logger = new Logger(
    InternationalCompetitionsTipsScheduler.name,
  );
  private readonly cronEnabled: boolean;

  // Competition types to handle
  private readonly competitionTypes = [
    CompetitionType.AFCON,
    CompetitionType.COPA_AMERICA,
    CompetitionType.EUROS,
    CompetitionType.UEFA_NATIONS_LEAGUE,
    CompetitionType.INTERNATIONAL_FRIENDLY,
    CompetitionType.INTERNATIONAL_QUALIFIER,
  ];

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
    this.logger.log(
      "=== International Competitions Tips Scheduler Initialization ===",
    );
    this.logger.log(
      `AI_TIP_GENERATION_CRON_ENABLED: ${this.cronEnabled}`,
    );

    if (!this.cronEnabled) {
      this.logger.warn(
        "AI tip generation cron is disabled. International competition tips will not be generated.",
      );
      return;
    }

    this.logger.log(
      "✓ International competitions tips scheduler enabled - will run daily",
    );
    this.logger.log(
      "=== International Competitions Tips Scheduler Initialization Complete ===",
    );
  }

  /**
   * Generate tips for international competitions - runs daily at 8 AM
   */
  @Cron("0 8 * * *") // Daily at 8 AM
  async generateInternationalCompetitionTips(): Promise<void> {
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

      // Get date range: next 7 days
      const now = new Date();
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);

      this.logger.log(
        `Generating international competition tips for ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      // Process each competition type
      for (const competitionType of this.competitionTypes) {
        try {
          const matches =
            await this.matchSelectionService.selectInternationalMatches(
              competitionType,
              startDate,
              endDate,
            );

          if (matches.length === 0) {
            this.logger.debug(
              `No ${competitionType} matches found in date range`,
            );
            continue;
          }

          this.logger.log(
            `Selected ${matches.length} ${competitionType} matches for tip generation`,
          );

          // Generate tip
          const result =
            await this.aiTipGenerationService.generateTipForMatches(matches, {
              competitionType,
              titleTemplate: this.getTitleTemplate(competitionType),
              autoPublish: true,
              batchId: `${competitionType}-${Date.now()}`,
            });

          if (result) {
            this.logger.log(
              `✅ ${competitionType} tip generated successfully! Tip ID: ${result.tip.id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to generate tips for ${competitionType}: ${error.message}`,
            error.stack,
          );
          // Continue with other competition types
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate international competition tips: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get title template for competition type
   */
  private getTitleTemplate(competitionType: CompetitionType): string {
    const templates: Record<CompetitionType, string> = {
      [CompetitionType.AFCON]: "AFCON Picks",
      [CompetitionType.COPA_AMERICA]: "Copa America Picks",
      [CompetitionType.EUROS]: "European Championship Picks",
      [CompetitionType.UEFA_NATIONS_LEAGUE]: "UEFA Nations League Picks",
      [CompetitionType.INTERNATIONAL_FRIENDLY]: "International Friendly Picks",
      [CompetitionType.INTERNATIONAL_QUALIFIER]: "Qualifier Picks",
      [CompetitionType.WEEKEND_LEAGUE]: "Weekend Acca",
      [CompetitionType.CHAMPIONS_LEAGUE]: "Champions League Picks",
      [CompetitionType.EUROPA_LEAGUE]: "Europa League Picks",
      [CompetitionType.OTHER]: "Match Picks",
    };

    return templates[competitionType] || "Match Picks";
  }
}
