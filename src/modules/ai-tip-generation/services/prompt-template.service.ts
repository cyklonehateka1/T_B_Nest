import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CompetitionType } from "../../../common/enums/competition-type.enum";
import { OptimizedContext } from "./context-optimizer.service";

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);
  private readonly promptVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.promptVersion =
      this.configService.get<string>("AI_PROMPT_VERSION") || "v1.0";
    this.logger.log(`Prompt template service initialized - Version: ${this.promptVersion}`);
  }

  /**
   * Generate system prompt based on data maturity
   */
  generateSystemPrompt(maturityScore: number): string {
    if (maturityScore < 30) {
      return this.getLowMaturitySystemPrompt();
    } else if (maturityScore < 70) {
      return this.getMediumMaturitySystemPrompt();
    } else {
      return this.getHighMaturitySystemPrompt();
    }
  }

  /**
   * Generate user prompt with match context
   */
  generateUserPrompt(
    context: OptimizedContext,
    competitionType: CompetitionType,
  ): string {
    const maturityNote = this.getMaturityNote(context.maturity.score);
    const competitionContext = this.getCompetitionContext(competitionType);

    return `Analyze the following match and provide betting predictions.

${competitionContext}

${maturityNote}

MATCH INFORMATION:
${JSON.stringify(context.match, null, 2)}

${context.odds && Object.keys(context.odds).length > 0 ? `CURRENT ODDS:
${JSON.stringify(context.odds, null, 2)}` : ""}

${context.historical && Object.keys(context.historical).length > 0 ? `HISTORICAL DATA:
${this.formatHistoricalData(context.historical)}` : "Note: Limited historical data available. Rely on your general knowledge of these teams and the competition."}

${context.importance && (context.importance.homeTeamImportance || context.importance.awayTeamImportance) ? `TEAM IMPORTANCE:
${this.formatImportance(context.importance)}` : ""}

${context.predictability && context.predictability.score ? `PREDICTABILITY SCORE: ${context.predictability.score.toFixed(0)}/100
${context.predictability.factors ? `Factors: ${context.predictability.factors}` : ""}` : ""}

REQUIREMENTS:
1. Analyze the match considering all provided data
2. Provide 1-5 betting predictions (selections) with reasoning
3. Each prediction must include:
   - Prediction type (match_result, over_under, both_teams_to_score, etc.)
   - Prediction value (e.g., "home_win", "over_2.5", "yes")
   - Odds (from provided odds data)
   - Confidence level (0-100)
   - Brief reasoning (1-2 sentences)

4. Provide an overall tip title and description
5. Calculate total odds (multiply all selection odds)
6. Only suggest predictions with odds between 1.5 and 50.0

OUTPUT FORMAT (JSON):
{
  "title": "Tip title (e.g., 'Weekend Acca', 'Champions League Picks')",
  "description": "Brief description of the tip and reasoning",
  "confidence": 75,
  "reasoning": "Overall analysis and reasoning for these predictions",
  "selections": [
    {
      "matchId": "match-id-here",
      "predictionType": "match_result",
      "predictionValue": "home_win",
      "odds": 2.10,
      "confidence": 80,
      "reasoning": "Home team has strong form and home advantage"
    }
  ],
  "totalOdds": 4.20
}

Ensure all predictions are well-reasoned and based on the provided data.`;
  }

  /**
   * Get system prompt for low data maturity
   */
  private getLowMaturitySystemPrompt(): string {
    return `You are an expert sports betting analyst with extensive knowledge of football teams, leagues, and betting markets.

Your task is to analyze football matches and provide accurate betting predictions.

When you receive match data with limited historical statistics, you should:
1. Rely on your extensive training data knowledge about teams, leagues, and competitions
2. Use general patterns and trends you know about similar matchups
3. Consider team reputations, league characteristics, and historical patterns
4. Apply your knowledge of betting markets and odds interpretation

Provide detailed, well-reasoned predictions based on your knowledge, even when specific historical data is limited.

Always output valid JSON in the exact format specified.`;
  }

  /**
   * Get system prompt for medium data maturity
   */
  private getMediumMaturitySystemPrompt(): string {
    return `You are an expert sports betting analyst with extensive knowledge of football teams, leagues, and betting markets.

Your task is to analyze football matches and provide accurate betting predictions.

When you receive match data with some historical statistics:
1. Prioritize the provided historical data as your primary source
2. Supplement gaps in the data with your general knowledge
3. Use your knowledge to provide context and explain patterns
4. Combine statistical analysis with your understanding of team dynamics

Provide detailed, well-reasoned predictions that blend statistical analysis with expert knowledge.

Always output valid JSON in the exact format specified.`;
  }

  /**
   * Get system prompt for high data maturity
   */
  private getHighMaturitySystemPrompt(): string {
    return `You are an expert sports betting analyst with extensive knowledge of football teams, leagues, and betting markets.

Your task is to analyze football matches and provide accurate betting predictions.

You will receive comprehensive historical data. Your approach should be:
1. Use the provided historical data as your PRIMARY and PRIMARY source of analysis
2. Apply statistical analysis and pattern recognition to the data
3. Use your knowledge primarily to interpret and explain the data patterns
4. Base predictions primarily on data-driven insights

Provide detailed, data-driven predictions with clear statistical reasoning.

Always output valid JSON in the exact format specified.`;
  }

  /**
   * Get maturity note for user prompt
   */
  private getMaturityNote(score: number): string {
    if (score < 30) {
      return `⚠️ DATA QUALITY: LOW (Score: ${score}/100)
Limited historical data available. Please rely on your extensive knowledge of these teams, their typical playing styles, league characteristics, and historical patterns. Use the provided data as supplementary information.`;
    } else if (score < 70) {
      return `📊 DATA QUALITY: MEDIUM (Score: ${score}/100)
Some historical data is available. Prioritize the provided data, but supplement with your knowledge where data is missing or incomplete.`;
    } else {
      return `✅ DATA QUALITY: HIGH (Score: ${score}/100)
Comprehensive historical data is available. Base your analysis primarily on this data, using your knowledge to interpret patterns and provide context.`;
    }
  }

  /**
   * Get competition-specific context
   */
  private getCompetitionContext(competitionType: CompetitionType): string {
    const contexts: Record<CompetitionType, string> = {
      [CompetitionType.WEEKEND_LEAGUE]:
        "This is a domestic league match. Consider league standings, form, and home/away records.",
      [CompetitionType.CHAMPIONS_LEAGUE]:
        "This is a UEFA Champions League match. Consider European form, knockout stage dynamics, and team motivation.",
      [CompetitionType.EUROPA_LEAGUE]:
        "This is a UEFA Europa League match. Consider European competition experience and team depth.",
      [CompetitionType.AFCON]:
        "This is an Africa Cup of Nations match. Consider international form, team chemistry, and tournament dynamics.",
      [CompetitionType.COPA_AMERICA]:
        "This is a Copa America match. Consider South American football styles and tournament intensity.",
      [CompetitionType.EUROS]:
        "This is a European Championship match. Consider international form and tournament pressure.",
      [CompetitionType.UEFA_NATIONS_LEAGUE]:
        "This is a UEFA Nations League match. Consider recent international form and competition format.",
      [CompetitionType.INTERNATIONAL_FRIENDLY]:
        "This is an international friendly. Consider that teams may experiment with lineups and tactics.",
      [CompetitionType.INTERNATIONAL_QUALIFIER]:
        "This is a qualification match. Consider high stakes and team motivation.",
      [CompetitionType.OTHER]:
        "Analyze this match considering the competition context.",
    };

    return contexts[competitionType] || contexts[CompetitionType.OTHER];
  }

  /**
   * Format historical data for prompt
   */
  private formatHistoricalData(
    historical: OptimizedContext["historical"],
  ): string {
    const parts: string[] = [];

    if (historical.homeTeamStats) {
      parts.push(`Home Team: ${historical.homeTeamStats}`);
    }

    if (historical.awayTeamStats) {
      parts.push(`Away Team: ${historical.awayTeamStats}`);
    }

    if (historical.headToHead) {
      parts.push(`Head-to-Head: ${historical.headToHead}`);
    }

    if (historical.homeTeamForm) {
      parts.push(`Home Team Form (last 5): ${historical.homeTeamForm}`);
    }

    if (historical.awayTeamForm) {
      parts.push(`Away Team Form (last 5): ${historical.awayTeamForm}`);
    }

    return parts.join("\n");
  }

  /**
   * Format importance data for prompt
   */
  private formatImportance(
    importance: OptimizedContext["importance"],
  ): string {
    const parts: string[] = [];

    if (importance.homeTeamImportance) {
      parts.push(`Home Team: ${importance.homeTeamImportance.toFixed(0)}/100`);
    }

    if (importance.awayTeamImportance) {
      parts.push(`Away Team: ${importance.awayTeamImportance.toFixed(0)}/100`);
    }

    if (importance.combinedImportance) {
      parts.push(
        `Combined: ${importance.combinedImportance.toFixed(0)}/100`,
      );
    }

    return parts.join(" | ");
  }

  /**
   * Get prompt version
   */
  getPromptVersion(): string {
    return this.promptVersion;
  }
}
