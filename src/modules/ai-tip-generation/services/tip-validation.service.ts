import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MatchData } from "../../../common/entities/match-data.entity";
import { MatchStatusType } from "../../../common/enums/match-status-type.enum";
import { PredictionType } from "../../../common/enums/prediction-type.enum";
import { ParsedTip } from "../dto/ai-tip-response.dto";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class TipValidationService {
  private readonly logger = new Logger(TipValidationService.name);

  constructor(
    @InjectRepository(MatchData)
    private readonly matchDataRepository: Repository<MatchData>,
  ) {}

  /**
   * Validate AI-generated tip
   */
  async validateTip(
    parsedTip: ParsedTip,
    matchIds: string[],
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate structure
    if (!parsedTip.title || parsedTip.title.trim().length === 0) {
      errors.push("Title is required");
    } else if (parsedTip.title.length > 255) {
      errors.push("Title must not exceed 255 characters");
    }

    if (!parsedTip.selections || parsedTip.selections.length === 0) {
      errors.push("At least one selection is required");
    } else if (parsedTip.selections.length > 50) {
      errors.push("Maximum 50 selections allowed");
    }

    // 2. Validate confidence score
    if (
      parsedTip.confidence === undefined ||
      parsedTip.confidence === null
    ) {
      warnings.push("Confidence score not provided");
    } else if (parsedTip.confidence < 0 || parsedTip.confidence > 100) {
      errors.push("Confidence score must be between 0 and 100");
    }

    // 3. Validate total odds
    if (parsedTip.totalOdds !== undefined && parsedTip.totalOdds !== null) {
      if (parsedTip.totalOdds < 1.0) {
        errors.push("Total odds must be at least 1.0");
      } else if (parsedTip.totalOdds > 1000) {
        warnings.push("Total odds is very high (>1000)");
      }

      // Verify calculated odds match provided total
      const calculatedOdds = parsedTip.selections.reduce(
        (acc, sel) => acc * (sel.odds || 1),
        1,
      );
      const difference = Math.abs(calculatedOdds - parsedTip.totalOdds);
      if (difference > 0.1) {
        warnings.push(
          `Total odds (${parsedTip.totalOdds}) doesn't match calculated odds (${calculatedOdds.toFixed(2)})`,
        );
      }
    }

    // 4. Validate each selection
    for (let i = 0; i < parsedTip.selections.length; i++) {
      const selection = parsedTip.selections[i];
      const selectionErrors = await this.validateSelection(
        selection,
        matchIds,
        i + 1,
      );
      errors.push(...selectionErrors.errors);
      warnings.push(...selectionErrors.warnings);
    }

    // 5. Check for duplicate selections
    const selectionKeys = parsedTip.selections.map(
      (s) => `${s.matchId}-${s.predictionType}-${s.predictionValue}`,
    );
    const duplicates = selectionKeys.filter(
      (key, index) => selectionKeys.indexOf(key) !== index,
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate selections found: ${duplicates.join(", ")}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single selection
   */
  private async validateSelection(
    selection: ParsedTip["selections"][0],
    validMatchIds: string[],
    index: number,
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate match ID
    if (!selection.matchId) {
      errors.push(`Selection ${index}: Match ID is required`);
    } else if (!validMatchIds.includes(selection.matchId)) {
      errors.push(
        `Selection ${index}: Match ID ${selection.matchId} is not in the provided matches`,
      );
    } else {
      // Verify match exists and is valid
      const match = await this.matchDataRepository.findOne({
        where: { id: selection.matchId },
      });

      if (!match) {
        errors.push(`Selection ${index}: Match not found`);
      } else if (match.status !== MatchStatusType.scheduled) {
        errors.push(
          `Selection ${index}: Match is not scheduled (status: ${match.status})`,
        );
      }
    }

    // Validate prediction type
    if (!selection.predictionType) {
      errors.push(`Selection ${index}: Prediction type is required`);
    } else if (!Object.values(PredictionType).includes(selection.predictionType)) {
      errors.push(
        `Selection ${index}: Invalid prediction type: ${selection.predictionType}`,
      );
    }

    // Validate prediction value
    if (!selection.predictionValue || selection.predictionValue.trim().length === 0) {
      errors.push(`Selection ${index}: Prediction value is required`);
    } else if (selection.predictionValue.length > 100) {
      errors.push(
        `Selection ${index}: Prediction value must not exceed 100 characters`,
      );
    }

    // Validate prediction value matches type
    const valueValidation = this.validatePredictionValue(
      selection.predictionType,
      selection.predictionValue,
    );
    if (!valueValidation.isValid) {
      errors.push(
        `Selection ${index}: ${valueValidation.error || "Invalid prediction value for type"}`,
      );
    }

    // Validate odds
    if (selection.odds === undefined || selection.odds === null) {
      errors.push(`Selection ${index}: Odds are required`);
    } else {
      if (selection.odds < 1.0) {
        errors.push(`Selection ${index}: Odds must be at least 1.0`);
      } else if (selection.odds > 100) {
        warnings.push(`Selection ${index}: Odds are very high (>100)`);
      }
    }

    // Validate confidence
    if (selection.confidence === undefined || selection.confidence === null) {
      warnings.push(`Selection ${index}: Confidence not provided`);
    } else if (selection.confidence < 0 || selection.confidence > 100) {
      errors.push(
        `Selection ${index}: Confidence must be between 0 and 100`,
      );
    }

    // Validate reasoning
    if (!selection.reasoning || selection.reasoning.trim().length === 0) {
      warnings.push(`Selection ${index}: Reasoning not provided`);
    } else if (selection.reasoning.length > 500) {
      warnings.push(
        `Selection ${index}: Reasoning is very long (>500 characters)`,
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate prediction value matches prediction type
   */
  private validatePredictionValue(
    type: PredictionType,
    value: string,
  ): { isValid: boolean; error?: string } {
    const lowerValue = value.toLowerCase().trim();

    switch (type) {
      case PredictionType.MATCH_RESULT:
        if (!["home_win", "away_win", "draw"].includes(lowerValue)) {
          return {
            isValid: false,
            error: "Match result must be 'home_win', 'away_win', or 'draw'",
          };
        }
        break;

      case PredictionType.OVER_UNDER:
        if (!/^(over|under)_\d+(\.5)?$/.test(lowerValue)) {
          return {
            isValid: false,
            error: "Over/Under must be in format 'over_X' or 'under_X' (e.g., 'over_2.5')",
          };
        }
        break;

      case PredictionType.BOTH_TEAMS_TO_SCORE:
        if (!["yes", "no"].includes(lowerValue)) {
          return {
            isValid: false,
            error: "BTTS must be 'yes' or 'no'",
          };
        }
        break;

      case PredictionType.DOUBLE_CHANCE:
        if (
          !["home_draw", "home_away", "away_draw"].includes(lowerValue)
        ) {
          return {
            isValid: false,
            error:
              "Double chance must be 'home_draw', 'home_away', or 'away_draw'",
          };
        }
        break;

      case PredictionType.HANDICAP:
        if (!/^(home|away)_[+-]?\d+(\.5)?$/.test(lowerValue)) {
          return {
            isValid: false,
            error:
              "Handicap must be in format 'home_X' or 'away_X' (e.g., 'home_-1.5')",
          };
        }
        break;

      case PredictionType.CORRECT_SCORE:
        if (!/^\d+-\d+$/.test(lowerValue)) {
          return {
            isValid: false,
            error: "Correct score must be in format 'X-Y' (e.g., '2-1')",
          };
        }
        break;

      case PredictionType.FIRST_GOAL_SCORER:
        // Any string is valid for first goal scorer
        break;

      case PredictionType.ANY_OTHER:
        // Any string is valid
        break;

      default:
        return {
          isValid: false,
          error: `Unknown prediction type: ${type}`,
        };
    }

    return { isValid: true };
  }
}
