import { Injectable, Logger } from "@nestjs/common";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { PredictionType } from "../../common/enums/prediction-type.enum";
import { MatchStatusType } from "../../common/enums/match-status-type.enum";

export interface EvaluationResult {
  isCorrect: boolean | null; // null means cannot be determined yet
  isVoid: boolean;
  reason?: string;
}

@Injectable()
export class PredictionEvaluationService {
  private readonly logger = new Logger(PredictionEvaluationService.name);

  /**
   * Evaluate a tip selection against match results
   * @param selection The tip selection to evaluate
   * @param match The match data with results
   * @returns Evaluation result indicating if prediction is correct, void, or undetermined
   */
  evaluateSelection(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    // Check if match is finished and has scores
    if (match.status !== MatchStatusType.finished) {
      return {
        isCorrect: null,
        isVoid: false,
        reason: "Match not finished yet",
      };
    }

    // Check if match has scores
    if (
      match.homeScore === null ||
      match.homeScore === undefined ||
      match.awayScore === null ||
      match.awayScore === undefined
    ) {
      return {
        isCorrect: null,
        isVoid: false,
        reason: "Match finished but scores not available",
      };
    }

    // Handle void cases
    if (match.status === MatchStatusType.cancelled) {
      return {
        isCorrect: null,
        isVoid: true,
        reason: "Match was cancelled",
      };
    }

    if (match.status === MatchStatusType.postponed) {
      return {
        isCorrect: null,
        isVoid: true,
        reason: "Match was postponed",
      };
    }

    // Evaluate based on prediction type
    try {
      switch (selection.predictionType) {
        case PredictionType.MATCH_RESULT:
          return this.evaluateMatchResult(selection, match);
        case PredictionType.OVER_UNDER:
          return this.evaluateOverUnder(selection, match);
        case PredictionType.BOTH_TEAMS_TO_SCORE:
          return this.evaluateBothTeamsToScore(selection, match);
        case PredictionType.DOUBLE_CHANCE:
          return this.evaluateDoubleChance(selection, match);
        case PredictionType.HANDICAP:
          return this.evaluateHandicap(selection, match);
        case PredictionType.CORRECT_SCORE:
          return this.evaluateCorrectScore(selection, match);
        case PredictionType.FIRST_GOAL_SCORER:
          return this.evaluateFirstGoalScorer(selection, match);
        case PredictionType.ANY_OTHER:
          return this.evaluateAnyOther(selection, match);
        default:
          this.logger.warn(
            `Unknown prediction type: ${selection.predictionType}`,
          );
          return {
            isCorrect: null,
            isVoid: true,
            reason: `Unknown prediction type: ${selection.predictionType}`,
          };
      }
    } catch (error) {
      this.logger.error(
        `Error evaluating selection ${selection.id}: ${error.message}`,
        error.stack,
      );
      return {
        isCorrect: null,
        isVoid: true,
        reason: `Evaluation error: ${error.message}`,
      };
    }
  }

  /**
   * Evaluate MATCH_RESULT prediction (home_win, away_win, draw)
   */
  private evaluateMatchResult(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;
    const predictionValue = selection.predictionValue.toLowerCase();

    let actualResult: string;
    if (homeScore > awayScore) {
      actualResult = "home_win";
    } else if (awayScore > homeScore) {
      actualResult = "away_win";
    } else {
      actualResult = "draw";
    }

    const isCorrect = predictionValue === actualResult;

    return {
      isCorrect,
      isVoid: false,
      reason: isCorrect
        ? `Correct: ${actualResult}`
        : `Incorrect: predicted ${predictionValue}, actual ${actualResult}`,
    };
  }

  /**
   * Evaluate OVER_UNDER prediction (over_X.5, under_X.5)
   */
  private evaluateOverUnder(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    const totalGoals = match.homeScore! + match.awayScore!;
    const predictionValue = selection.predictionValue.toLowerCase();

    // Parse prediction value (e.g., "over_2.5" -> 2.5)
    const matchResult = predictionValue.match(/(over|under)_(\d+\.?\d*)/);
    if (!matchResult) {
      return {
        isCorrect: null,
        isVoid: true,
        reason: `Invalid over/under prediction format: ${predictionValue}`,
      };
    }

    const direction = matchResult[1]; // "over" or "under"
    const threshold = parseFloat(matchResult[2]);

    let isCorrect: boolean;
    if (direction === "over") {
      isCorrect = totalGoals > threshold;
    } else {
      isCorrect = totalGoals < threshold;
    }

    return {
      isCorrect,
      isVoid: false,
      reason: isCorrect
        ? `Correct: ${totalGoals} goals ${direction} ${threshold}`
        : `Incorrect: ${totalGoals} goals is not ${direction} ${threshold}`,
    };
  }

  /**
   * Evaluate BOTH_TEAMS_TO_SCORE prediction (btts_yes, btts_no)
   */
  private evaluateBothTeamsToScore(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;
    const predictionValue = selection.predictionValue.toLowerCase();

    const bothScored = homeScore > 0 && awayScore > 0;
    const predictedBothScored = predictionValue === "btts_yes" || predictionValue === "yes";

    const isCorrect = bothScored === predictedBothScored;

    return {
      isCorrect,
      isVoid: false,
      reason: isCorrect
        ? `Correct: Both teams ${bothScored ? "scored" : "did not both score"}`
        : `Incorrect: Predicted ${predictionValue}, actual ${bothScored ? "both scored" : "not both scored"}`,
    };
  }

  /**
   * Evaluate DOUBLE_CHANCE prediction (home_draw, home_away, away_draw)
   */
  private evaluateDoubleChance(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;
    const predictionValue = selection.predictionValue.toLowerCase();

    // Determine actual match result
    let actualResult: string;
    if (homeScore > awayScore) {
      actualResult = "home_win";
    } else if (awayScore > homeScore) {
      actualResult = "away_win";
    } else {
      actualResult = "draw";
    }

    // Check if prediction covers the actual result
    let isCorrect = false;
    if (predictionValue === "home_draw") {
      isCorrect = actualResult === "home_win" || actualResult === "draw";
    } else if (predictionValue === "home_away") {
      isCorrect = actualResult === "home_win" || actualResult === "away_win";
    } else if (predictionValue === "away_draw") {
      isCorrect = actualResult === "away_win" || actualResult === "draw";
    }

    return {
      isCorrect,
      isVoid: false,
      reason: isCorrect
        ? `Correct: ${predictionValue} covers ${actualResult}`
        : `Incorrect: ${predictionValue} does not cover ${actualResult}`,
    };
  }

  /**
   * Evaluate HANDICAP prediction
   * Format: "handicap_+1.5" or "handicap_-1.5" (positive = home advantage, negative = away advantage)
   */
  private evaluateHandicap(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;
    const predictionValue = selection.predictionValue.toLowerCase();

    // Parse handicap (e.g., "handicap_+1.5" -> +1.5)
    const matchResult = predictionValue.match(/handicap_([+-]?\d+\.?\d*)/);
    if (!matchResult) {
      return {
        isCorrect: null,
        isVoid: true,
        reason: `Invalid handicap format: ${predictionValue}`,
      };
    }

    const handicap = parseFloat(matchResult[1]);
    const adjustedHomeScore = homeScore + handicap;

    // If adjusted home score > away score, home wins with handicap
    const homeWinsWithHandicap = adjustedHomeScore > awayScore;
    const isCorrect = homeWinsWithHandicap;

    return {
      isCorrect,
      isVoid: false,
      reason: isCorrect
        ? `Correct: Home ${homeScore} + ${handicap} = ${adjustedHomeScore} > Away ${awayScore}`
        : `Incorrect: Home ${homeScore} + ${handicap} = ${adjustedHomeScore} <= Away ${awayScore}`,
    };
  }

  /**
   * Evaluate CORRECT_SCORE prediction (e.g., "2-1", "0-0")
   */
  private evaluateCorrectScore(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;
    const predictionValue = selection.predictionValue;

    // Parse prediction (e.g., "2-1" -> home: 2, away: 1)
    const parts = predictionValue.split("-");
    if (parts.length !== 2) {
      return {
        isCorrect: null,
        isVoid: true,
        reason: `Invalid correct score format: ${predictionValue}`,
      };
    }

    const predictedHome = parseInt(parts[0].trim(), 10);
    const predictedAway = parseInt(parts[1].trim(), 10);

    if (isNaN(predictedHome) || isNaN(predictedAway)) {
      return {
        isCorrect: null,
        isVoid: true,
        reason: `Invalid correct score numbers: ${predictionValue}`,
      };
    }

    const isCorrect =
      homeScore === predictedHome && awayScore === predictedAway;

    return {
      isCorrect,
      isVoid: false,
      reason: isCorrect
        ? `Correct: ${homeScore}-${awayScore} matches prediction`
        : `Incorrect: Predicted ${predictionValue}, actual ${homeScore}-${awayScore}`,
    };
  }

  /**
   * Evaluate FIRST_GOAL_SCORER prediction
   * Note: This requires additional match event data which may not be available
   */
  private evaluateFirstGoalScorer(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    // This would require match event data (goals with timestamps)
    // For now, mark as void if we don't have this data
    return {
      isCorrect: null,
      isVoid: true,
      reason: "First goal scorer evaluation requires match event data (not yet implemented)",
    };
  }

  /**
   * Evaluate ANY_OTHER prediction
   * This is a catch-all for custom predictions that need special handling
   */
  private evaluateAnyOther(
    selection: TipSelection,
    match: MatchData,
  ): EvaluationResult {
    // Custom logic would be needed based on prediction_value format
    // For now, mark as void
    return {
      isCorrect: null,
      isVoid: true,
      reason: "Any other prediction type requires custom evaluation logic",
    };
  }
}
