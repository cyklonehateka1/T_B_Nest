import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Cron } from "@nestjs/schedule";
import { Tip } from "../../common/entities/tip.entity";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { TipStatusType } from "../../common/enums/tip-status-type.enum";
import { MatchStatusType } from "../../common/enums/match-status-type.enum";

interface DeterminationStats {
  totalPending: number;
  readyForDetermination: number;
  waitingForEvaluations: number;
}

@Injectable()
export class TipOutcomeDeterminationScheduler implements OnModuleInit {
  private readonly logger = new Logger(TipOutcomeDeterminationScheduler.name);

  private readonly cronEnabled: boolean;
  private readonly determinationEnabled: boolean;

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(TipSelection)
    private readonly tipSelectionRepository: Repository<TipSelection>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled =
      this.configService.get<string>("TIP_EVALUATION_CRON_ENABLED") === "true";
    this.determinationEnabled =
      this.configService.get<string>(
        "TIP_OUTCOME_DETERMINATION_ENABLED",
      ) === "true";
  }

  onModuleInit() {
    this.logger.log("=== TipOutcomeDeterminationScheduler Initialization ===");
    this.logger.log(`TIP_EVALUATION_CRON_ENABLED: ${this.cronEnabled}`);
    this.logger.log(
      `TIP_OUTCOME_DETERMINATION_ENABLED: ${this.determinationEnabled}`,
    );

    if (!this.cronEnabled) {
      this.logger.warn(
        "Tip evaluation cron is disabled (TIP_EVALUATION_CRON_ENABLED=false). All cron jobs are deactivated.",
      );
    } else {
      if (this.determinationEnabled) {
        this.logger.log(
          "✓ Tip outcome determination enabled - determining tip outcomes based on selections",
        );
        this.logger.log(
          `  Cron job will run every 15 minutes: @Cron("*/15 * * * *")`,
        );
      } else {
        this.logger.warn(
          "Tip outcome determination is disabled (TIP_OUTCOME_DETERMINATION_ENABLED=false)",
        );
      }
    }
    this.logger.log(
      "=== TipOutcomeDeterminationScheduler Initialization Complete ===",
    );
  }

  /**
   * Determine tip outcomes based on evaluated selections
   * Runs every 15 minutes
   */
  @Cron("*/15 * * * *")
  async determineTipOutcomes(): Promise<void> {
    this.logger.debug(
      `[CRON] determineTipOutcomes called - cronEnabled: ${this.cronEnabled}, determinationEnabled: ${this.determinationEnabled}`,
    );

    if (!this.cronEnabled || !this.determinationEnabled) {
      this.logger.debug(
        "[CRON] determineTipOutcomes skipped - cron or determination is disabled",
      );
      return;
    }

    this.logger.log("[CRON] Starting tip outcome determination...");

    try {
      // Find tips that are still pending and need outcome determination
      const pendingTips = await this.tipRepository.find({
        where: {
          status: TipStatusType.PENDING,
        },
        relations: ["selections", "selections.match"],
      });

      if (pendingTips.length === 0) {
        this.logger.debug("[CRON] No pending tips found to process");
        return;
      }

      this.logger.log(
        `[CRON] Found ${pendingTips.length} pending tip(s) to process`,
      );

      let processedCount = 0;
      let notReadyCount = 0;
      let errorCount = 0;

      for (const tip of pendingTips) {
        try {
          // Check if all selections have been evaluated
          const outcome = await this.determineTipOutcome(tip);

          if (outcome === null) {
            // Tip is not ready for outcome determination yet
            notReadyCount++;
            continue;
          }

          // Update tip status
          tip.status = outcome;

          // Update all purchases of this tip
          const purchases = await this.purchaseRepository.find({
            where: {
              tip: { id: tip.id },
            },
          });

          for (const purchase of purchases) {
            purchase.tipOutcome = outcome;
            await this.purchaseRepository.save(purchase);
          }

          await this.tipRepository.save(tip);

          this.logger.log(
            `Tip ${tip.id} outcome determined: ${outcome} (${purchases.length} purchase(s) updated)`,
          );

          processedCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to determine outcome for tip ${tip.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `[CRON] Tip outcome determination complete - Processed: ${processedCount}, Not Ready: ${notReadyCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in determineTipOutcomes: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Determine the outcome of a tip based on its selections
   * @param tip The tip to evaluate
   * @returns The determined outcome (WON, LOST, VOID) or null if not ready yet
   */
  private async determineTipOutcome(
    tip: Tip,
  ): Promise<TipStatusType | null> {
    if (!tip.selections || tip.selections.length === 0) {
      this.logger.warn(`Tip ${tip.id} has no selections`);
      return TipStatusType.LOST; // No selections = lost
    }

    // Check if all matches are finished
    const allMatchesFinished = tip.selections.every(
      (selection) => selection.match.status === MatchStatusType.finished,
    );

    if (!allMatchesFinished) {
      // Not all matches are finished yet
      return null;
    }

    // Check if all selections have been evaluated
    const allEvaluated = tip.selections.every(
      (selection) =>
        selection.isCorrect !== null || selection.isVoid === true,
    );

    if (!allEvaluated) {
      // Not all selections have been evaluated yet
      return null;
    }

    // Check for void selections
    const hasVoidSelection = tip.selections.some(
      (selection) => selection.isVoid === true,
    );

    if (hasVoidSelection) {
      // Business rule: If any selection is void, the tip is void
      // Alternative: Could implement partial void logic here
      return TipStatusType.VOID;
    }

    // Check if all selections are correct
    const allCorrect = tip.selections.every(
      (selection) => selection.isCorrect === true,
    );

    if (allCorrect) {
      return TipStatusType.WON;
    } else {
      // At least one selection is incorrect
      return TipStatusType.LOST;
    }
  }

  /**
   * Get statistics about pending tips (for monitoring/debugging)
   */
  async getDeterminationStats(): Promise<DeterminationStats> {
    const totalPending = await this.tipRepository.count({
      where: {
        status: TipStatusType.PENDING,
      },
    });

    // Count tips that are ready for outcome determination
    const pendingTips = await this.tipRepository.find({
      where: {
        status: TipStatusType.PENDING,
      },
      relations: ["selections", "selections.match"],
    });

    let readyCount = 0;
    let waitingCount = 0;

    for (const tip of pendingTips) {
      if (!tip.selections || tip.selections.length === 0) {
        waitingCount++;
        continue;
      }

      const allMatchesFinished = tip.selections.every(
        (selection) => selection.match.status === MatchStatusType.finished,
      );

      const allEvaluated = tip.selections.every(
        (selection) =>
          selection.isCorrect !== null || selection.isVoid === true,
      );

      if (allMatchesFinished && allEvaluated) {
        readyCount++;
      } else {
        waitingCount++;
      }
    }

    return {
      totalPending,
      readyForDetermination: readyCount,
      waitingForEvaluations: waitingCount,
    };
  }
}
