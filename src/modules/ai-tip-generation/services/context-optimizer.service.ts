import { Injectable, Logger } from "@nestjs/common";
import { MatchData } from "../../../common/entities/match-data.entity";
import { TeamStatistics } from "../../../common/entities/team-statistics.entity";
import { TeamHeadToHead } from "../../../common/entities/team-head-to-head.entity";
import { DataMaturityScore } from "../../../common/entities/data-maturity-score.entity";
import { TeamImportanceRating } from "../../../common/entities/team-importance-rating.entity";
import { MatchPredictabilityScore } from "../../../common/entities/match-predictability-score.entity";
import { CompetitionType } from "../../../common/enums/competition-type.enum";

export interface OptimizedContext {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    country?: string;
    date: string;
    venue?: string;
    round?: string;
    season?: string;
  };
  odds: {
    homeWin?: number;
    draw?: number;
    awayWin?: number;
    overUnder?: Record<string, number>;
    btts?: { yes: number; no: number };
  };
  historical: {
    homeTeamStats?: string; // Summarized
    awayTeamStats?: string; // Summarized
    headToHead?: string; // Summarized
    homeTeamForm?: string;
    awayTeamForm?: string;
  };
  importance: {
    homeTeamImportance?: number;
    awayTeamImportance?: number;
    combinedImportance?: number;
  };
  predictability: {
    score?: number;
    factors?: string; // Summarized
  };
  maturity: {
    score: number;
    confidence: string;
    note?: string;
  };
  metadata: {
    tokenEstimate: number;
    dataQuality: "low" | "medium" | "high";
  };
}

@Injectable()
export class ContextOptimizerService {
  private readonly logger = new Logger(ContextOptimizerService.name);
  private readonly maxTokens: number = 2000;
  private readonly tokenBudget: {
    system: number;
    match: number;
    historical: number;
    instructions: number;
  } = {
    system: 300,
    match: 200,
    historical: 1200,
    instructions: 200,
  };

  /**
   * Build optimized context for AI
   */
  async buildOptimizedContext(
    match: MatchData,
    homeStats: TeamStatistics | null,
    awayStats: TeamStatistics | null,
    h2h: TeamHeadToHead | null,
    maturity: DataMaturityScore | null,
    homeImportance: TeamImportanceRating | null,
    awayImportance: TeamImportanceRating | null,
    predictability: MatchPredictabilityScore | null,
    competitionType: CompetitionType,
  ): Promise<OptimizedContext> {
    const maturityScore = maturity?.score || 0;
    const maturityConfidence = maturity?.confidence || "low";

    // Build base context
    const context: OptimizedContext = {
      match: this.extractMatchInfo(match),
      odds: this.extractOdds(match.odds),
      historical: {},
      importance: {},
      predictability: {},
      maturity: {
        score: maturityScore,
        confidence: maturityConfidence,
      },
      metadata: {
        tokenEstimate: 0,
        dataQuality: this.determineDataQuality(maturityScore),
      },
    };

    // Add historical data based on maturity
    if (maturityScore >= 30) {
      context.historical.homeTeamStats = this.summarizeTeamStats(
        homeStats,
        "home",
      );
      context.historical.awayTeamStats = this.summarizeTeamStats(
        awayStats,
        "away",
      );
    }

    if (maturityScore >= 50 && h2h) {
      context.historical.headToHead = this.summarizeH2H(h2h);
    }

    if (homeStats?.recentForm) {
      context.historical.homeTeamForm = homeStats.recentForm;
    }

    if (awayStats?.recentForm) {
      context.historical.awayTeamForm = awayStats.recentForm;
    }

    // Add importance scores
    if (homeImportance) {
      context.importance.homeTeamImportance = Number(
        homeImportance.importanceScore,
      );
    }

    if (awayImportance) {
      context.importance.awayTeamImportance = Number(
        awayImportance.importanceScore,
      );
    }

    if (predictability) {
      context.importance.combinedImportance = Number(
        predictability.combinedImportanceScore,
      );
      context.predictability.score = Number(predictability.predictabilityScore);
      context.predictability.factors = this.summarizePredictabilityFactors(
        predictability.predictabilityFactors,
      );
    }

    // Estimate tokens and optimize if needed
    context.metadata.tokenEstimate = this.estimateTokens(context);
    const optimizedContext = this.optimizeForTokenBudget(context);

    return optimizedContext;
  }

  /**
   * Extract essential match information
   */
  private extractMatchInfo(match: MatchData): OptimizedContext["match"] {
    return {
      id: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.league?.name || "Unknown",
      country: match.league?.country,
      date: match.matchDatetime.toISOString(),
      venue: match.venue || undefined,
      round: match.round || undefined,
      season: match.season || undefined,
    };
  }

  /**
   * Extract and clean odds data
   */
  private extractOdds(odds?: Record<string, any>): OptimizedContext["odds"] {
    if (!odds) return {};

    const extracted: OptimizedContext["odds"] = {};

    // Extract match result odds
    if (odds.h2h && Array.isArray(odds.h2h) && odds.h2h.length > 0) {
      const h2hOdds = odds.h2h[0];
      if (h2hOdds.home) extracted.homeWin = Number(h2hOdds.home);
      if (h2hOdds.draw) extracted.draw = Number(h2hOdds.draw);
      if (h2hOdds.away) extracted.awayWin = Number(h2hOdds.away);
    }

    // Extract totals (over/under)
    if (odds.totals && Array.isArray(odds.totals) && odds.totals.length > 0) {
      const totals = odds.totals[0];
      extracted.overUnder = {};
      for (const [key, value] of Object.entries(totals)) {
        if (key.startsWith("over_") || key.startsWith("under_")) {
          extracted.overUnder[key] = Number(value);
        }
      }
    }

    // Extract BTTS
    if (odds.btts && Array.isArray(odds.btts) && odds.btts.length > 0) {
      const btts = odds.btts[0];
      if (btts.yes) extracted.btts = { yes: Number(btts.yes), no: Number(btts.no || 0) };
    }

    return extracted;
  }

  /**
   * Summarize team statistics into compact format
   */
  private summarizeTeamStats(
    stats: TeamStatistics | null,
    context: "home" | "away",
  ): string {
    if (!stats) {
      return "No statistics available";
    }

    const parts: string[] = [];

    // Overall record
    if (stats.matchesPlayed > 0) {
      parts.push(
        `Record: ${stats.wins}W-${stats.draws}D-${stats.losses}L (${stats.matchesPlayed} matches)`,
      );
    }

    // Goals
    if (stats.avgGoalsScored !== null && stats.avgGoalsScored !== undefined) {
      parts.push(
        `Avg: ${Number(stats.avgGoalsScored).toFixed(1)} scored, ${Number(stats.avgGoalsConceded).toFixed(1)} conceded`,
      );
    }

    // Recent form
    if (stats.recentForm) {
      parts.push(`Form: ${stats.recentForm}`);
    }

    // Home/Away specific
    if (context === "home" && stats.homeMatches > 0) {
      const homeWinRate = ((stats.homeWins / stats.homeMatches) * 100).toFixed(
        0,
      );
      parts.push(`Home: ${stats.homeWins}W-${stats.homeDraws}D-${stats.homeLosses}L (${homeWinRate}% win rate)`);
    }

    if (context === "away" && stats.awayMatches > 0) {
      const awayWinRate = ((stats.awayWins / stats.awayMatches) * 100).toFixed(
        0,
      );
      parts.push(`Away: ${stats.awayWins}W-${stats.awayDraws}D-${stats.awayLosses}L (${awayWinRate}% win rate)`);
    }

    // League position
    if (stats.leaguePosition) {
      parts.push(`Position: ${stats.leaguePosition}`);
    }

    return parts.join(" | ");
  }

  /**
   * Summarize head-to-head data
   */
  private summarizeH2H(h2h: TeamHeadToHead): string {
    if (h2h.totalMatches === 0) {
      return "No head-to-head history";
    }

    const parts: string[] = [];

    // Overall H2H
    parts.push(
      `H2H: ${h2h.teamAWins}W-${h2h.draws}D-${h2h.teamBWins}L (${h2h.totalMatches} matches)`,
    );

    // Recent matches
    if (h2h.recentMatches && h2h.recentMatches.length > 0) {
      const recent = h2h.recentMatches.slice(0, 3); // Last 3 matches
      const results = recent.map((m) => {
        if (m.result === "home") return "W";
        if (m.result === "away") return "L";
        return "D";
      });
      parts.push(`Recent: ${results.join("-")}`);
    }

    // Home advantage
    if (h2h.teamAHomeWins > 0 || h2h.teamBHomeWins > 0) {
      parts.push(
        `Home advantage: Team A ${h2h.teamAHomeWins}W, Team B ${h2h.teamBHomeWins}W`,
      );
    }

    return parts.join(" | ");
  }

  /**
   * Summarize predictability factors
   */
  private summarizePredictabilityFactors(
    factors?: MatchPredictabilityScore["predictabilityFactors"],
  ): string {
    if (!factors) return "";

    const parts: string[] = [];

    if (factors.teamFormConsistency !== undefined) {
      parts.push(
        `Form consistency: ${factors.teamFormConsistency.toFixed(0)}%`,
      );
    }

    if (factors.headToHeadPattern !== undefined) {
      parts.push(`H2H pattern: ${factors.headToHeadPattern.toFixed(0)}%`);
    }

    if (factors.homeAdvantage !== undefined) {
      parts.push(`Home advantage: ${factors.homeAdvantage.toFixed(0)}%`);
    }

    if (factors.oddsClarity !== undefined) {
      parts.push(`Odds clarity: ${factors.oddsClarity.toFixed(0)}%`);
    }

    return parts.join(", ");
  }

  /**
   * Determine data quality level
   */
  private determineDataQuality(score: number): "low" | "medium" | "high" {
    if (score < 30) return "low";
    if (score < 70) return "medium";
    return "high";
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(context: OptimizedContext): number {
    const contextString = JSON.stringify(context);
    return Math.ceil(contextString.length / 4);
  }

  /**
   * Optimize context to fit token budget
   */
  private optimizeForTokenBudget(
    context: OptimizedContext,
  ): OptimizedContext {
    const estimated = this.estimateTokens(context);
    const availableTokens = this.maxTokens - this.tokenBudget.system - this.tokenBudget.instructions;

    if (estimated <= availableTokens) {
      return context;
    }

    // Need to reduce context
    this.logger.debug(
      `Context too large (${estimated} tokens). Optimizing to fit ${availableTokens} token budget...`,
    );

    const optimized = { ...context };

    // Remove less critical data if over budget
    if (estimated > availableTokens * 1.2) {
      // Aggressive optimization
      delete optimized.historical.headToHead;
      delete optimized.predictability.factors;
    }

    if (estimated > availableTokens * 1.1) {
      // Moderate optimization
      optimized.historical.homeTeamStats = this.compressStats(
        optimized.historical.homeTeamStats || "",
      );
      optimized.historical.awayTeamStats = this.compressStats(
        optimized.historical.awayTeamStats || "",
      );
    }

    return optimized;
  }

  /**
   * Compress stats string further
   */
  private compressStats(stats: string): string {
    // Remove less critical parts
    return stats
      .split(" | ")
      .slice(0, 3) // Keep only first 3 parts
      .join(" | ");
  }

  /**
   * Format context for prompt (JSON string)
   */
  formatContextForPrompt(context: OptimizedContext): string {
    // Remove metadata before sending to AI
    const { metadata, ...contextForAI } = context;
    return JSON.stringify(contextForAI, null, 2);
  }
}
