import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import { Cron } from "@nestjs/schedule";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { MatchStatusType } from "../../common/enums/match-status-type.enum";
import { PredictionEvaluationService } from "./prediction-evaluation.service";

interface EvaluationStats {
  totalUnevaluated: number;
  readyForEvaluation: number;
  waitingForMatchResults: number;
}

@Injectable()
export class TipSelectionEvaluationScheduler implements OnModuleInit {
  private readonly logger = new Logger(TipSelectionEvaluationScheduler.name);

  private readonly cronEnabled: boolean;
  private readonly evaluationEnabled: boolean;

  constructor(
    @InjectRepository(TipSelection)
    private readonly tipSelectionRepository: Repository<TipSelection>,
    @InjectRepository(MatchData)
    private readonly matchDataRepository: Repository<MatchData>,
    private readonly predictionEvaluationService: PredictionEvaluationService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled =
      this.configService.get<string>("TIP_EVALUATION_CRON_ENABLED") === "true";
    this.evaluationEnabled =
      this.configService.get<string>(
        "TIP_SELECTION_EVALUATION_ENABLED",
      ) === "true";
  }

  onModuleInit() {
    this.logger.log("=== TipSelectionEvaluationScheduler Initialization ===");
    this.logger.log(`TIP_EVALUATION_CRON_ENABLED: ${this.cronEnabled}`);
    this.logger.log(
      `TIP_SELECTION_EVALUATION_ENABLED: ${this.evaluationEnabled}`,
    );

    if (!this.cronEnabled) {
      this.logger.warn(
        "Tip evaluation cron is disabled (TIP_EVALUATION_CRON_ENABLED=false). All cron jobs are deactivated.",
      );
    } else {
      if (this.evaluationEnabled) {
        this.logger.log(
          "✓ Tip selection evaluation enabled - evaluating selections for finished matches",
        );
        this.logger.log(
          `  Cron job will run every 15 minutes: @Cron("*/15 * * * *")`,
        );
      } else {
        this.logger.warn(
          "Tip selection evaluation is disabled (TIP_SELECTION_EVALUATION_ENABLED=false)",
        );
      }
    }
    this.logger.log(
      "=== TipSelectionEvaluationScheduler Initialization Complete ===",
    );
  }

  /**
   * Evaluate tip selections for finished matches
   * Runs every 15 minutes
   */
  @Cron("*/15 * * * *")
  async evaluateTipSelections(): Promise<void> {
    this.logger.debug(
      `[CRON] evaluateTipSelections called - cronEnabled: ${this.cronEnabled}, evaluationEnabled: ${this.evaluationEnabled}`,
    );

    if (!this.cronEnabled || !this.evaluationEnabled) {
      this.logger.debug(
        "[CRON] evaluateTipSelections skipped - cron or evaluation is disabled",
      );
      return;
    }

    this.logger.log("[CRON] Starting tip selection evaluation...");

    try {
      // Find selections that need evaluation:
      // - isCorrect is NULL (not yet evaluated)
      // - isVoid is false (not voided)
      // - Match is finished
      // - Match has scores
      const unevaluatedSelections = await this.tipSelectionRepository.find({
        where: {
          isCorrect: IsNull(),
          isVoid: false,
        },
        relations: ["match"],
      });

      if (unevaluatedSelections.length === 0) {
        this.logger.debug(
          "[CRON] No unevaluated selections found to process",
        );
        return;
      }

      this.logger.log(
        `[CRON] Found ${unevaluatedSelections.length} unevaluated selection(s) to process`,
      );

      let evaluatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const selection of unevaluatedSelections) {
        try {
          // Check if match is finished and has scores
          if (selection.match.status !== MatchStatusType.finished) {
            skippedCount++;
            continue;
          }

          if (
            selection.match.homeScore === null ||
            selection.match.homeScore === undefined ||
            selection.match.awayScore === null ||
            selection.match.awayScore === undefined
          ) {
            skippedCount++;
            continue;
          }

          // Evaluate the selection
          const evaluationResult =
            this.predictionEvaluationService.evaluateSelection(
              selection,
              selection.match,
            );

          // Update selection based on evaluation result
          if (evaluationResult.isVoid) {
            selection.isVoid = true;
            selection.isCorrect = null;
            this.logger.debug(
              `Selection ${selection.id} marked as void: ${evaluationResult.reason}`,
            );
          } else if (evaluationResult.isCorrect !== null) {
            selection.isCorrect = evaluationResult.isCorrect;
            selection.isVoid = false;
            this.logger.debug(
              `Selection ${selection.id} evaluated: ${evaluationResult.isCorrect ? "CORRECT" : "INCORRECT"} - ${evaluationResult.reason}`,
            );
          } else {
            // Cannot be determined yet (match not finished, scores not available, etc.)
            skippedCount++;
            continue;
          }

          await this.tipSelectionRepository.save(selection);
          evaluatedCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to evaluate selection ${selection.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `[CRON] Tip selection evaluation complete - Evaluated: ${evaluatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in evaluateTipSelections: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get statistics about unevaluated selections (for monitoring/debugging)
   */
  async getEvaluationStats(): Promise<EvaluationStats> {
    const allUnevaluated = await this.tipSelectionRepository.count({
      where: {
        isCorrect: IsNull(),
        isVoid: false,
      },
    });

    // Count selections where match is finished with scores
    const readySelections = await this.tipSelectionRepository
      .createQueryBuilder("selection")
      .innerJoin("selection.match", "match")
      .where("selection.isCorrect IS NULL")
      .andWhere("selection.isVoid = false")
      .andWhere("match.status = :status", {
        status: MatchStatusType.finished,
      })
      .andWhere("match.homeScore IS NOT NULL")
      .andWhere("match.awayScore IS NOT NULL")
      .getCount();

    return {
      totalUnevaluated: allUnevaluated,
      readyForEvaluation: readySelections,
      waitingForMatchResults: allUnevaluated - readySelections,
    };
  }
}
