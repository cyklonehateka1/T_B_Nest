import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Tip } from "../../../common/entities/tip.entity";
import { Tipster } from "../../../common/entities/tipster.entity";
import { TipSelection } from "../../../common/entities/tip-selection.entity";
import { MatchData } from "../../../common/entities/match-data.entity";
import { TeamStatistics } from "../../../common/entities/team-statistics.entity";
import { TeamHeadToHead } from "../../../common/entities/team-head-to-head.entity";
import { DataMaturityScore } from "../../../common/entities/data-maturity-score.entity";
import { TeamImportanceRating } from "../../../common/entities/team-importance-rating.entity";
import { MatchPredictabilityScore } from "../../../common/entities/match-predictability-score.entity";
import { AiTipGenerationQueue, GenerationQueueStatus } from "../../../common/entities/ai-tip-generation-queue.entity";
import { TipStatusType } from "../../../common/enums/tip-status-type.enum";
import { CompetitionType } from "../../../common/enums/competition-type.enum";
import { OllamaClientService } from "./ollama-client.service";
import { ContextOptimizerService, OptimizedContext } from "./context-optimizer.service";
import { PromptTemplateService } from "./prompt-template.service";
import { TipValidationService } from "./tip-validation.service";
import { ParsedTip } from "../dto/ai-tip-response.dto";

export interface GenerationOptions {
  competitionType: CompetitionType;
  titleTemplate?: string;
  autoPublish?: boolean;
  batchId?: string;
}

export interface GenerationResult {
  tip: Tip;
  context: OptimizedContext;
  latency: number;
}

@Injectable()
export class AiTipGenerationService {
  private readonly logger = new Logger(AiTipGenerationService.name);

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Tipster)
    private readonly tipsterRepository: Repository<Tipster>,
    @InjectRepository(TipSelection)
    private readonly tipSelectionRepository: Repository<TipSelection>,
    @InjectRepository(MatchData)
    private readonly matchDataRepository: Repository<MatchData>,
    @InjectRepository(TeamStatistics)
    private readonly teamStatsRepository: Repository<TeamStatistics>,
    @InjectRepository(TeamHeadToHead)
    private readonly h2hRepository: Repository<TeamHeadToHead>,
    @InjectRepository(DataMaturityScore)
    private readonly maturityRepository: Repository<DataMaturityScore>,
    @InjectRepository(TeamImportanceRating)
    private readonly importanceRepository: Repository<TeamImportanceRating>,
    @InjectRepository(MatchPredictabilityScore)
    private readonly predictabilityRepository: Repository<MatchPredictabilityScore>,
    @InjectRepository(AiTipGenerationQueue)
    private readonly generationQueueRepository: Repository<AiTipGenerationQueue>,
    private readonly dataSource: DataSource,
    private readonly ollamaClient: OllamaClientService,
    private readonly contextOptimizer: ContextOptimizerService,
    private readonly promptService: PromptTemplateService,
    private readonly validationService: TipValidationService,
  ) {}

  /**
   * Generate AI tip for multiple matches
   */
  async generateTipForMatches(
    matches: MatchData[],
    options: GenerationOptions,
  ): Promise<GenerationResult | null> {
    if (matches.length === 0) {
      this.logger.warn("No matches provided for tip generation");
      return null;
    }

    const startTime = Date.now();

    try {
      this.logger.log(
        `Generating AI tip for ${matches.length} match(es) - Competition: ${options.competitionType}`,
      );

      // 1. Build optimized context for all matches
      const contexts = await Promise.all(
        matches.map((match) => this.buildContextForMatch(match, options.competitionType)),
      );

      // 2. Combine contexts (for accumulator tips)
      const combinedContext = this.combineContexts(contexts, matches);

      // 3. Generate prompts
      const maturityScore = this.calculateAverageMaturity(contexts);
      const systemPrompt = this.promptService.generateSystemPrompt(maturityScore);
      const userPrompt = this.promptService.generateUserPrompt(
        combinedContext,
        options.competitionType,
      );

      // 4. Call Ollama
      this.logger.debug("Calling Ollama API...");
      const aiResponse = await this.ollamaClient.generate(userPrompt, systemPrompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      // 5. Parse response
      const parsedTip = this.parseAiResponse(aiResponse.response, matches);

      // 6. Validate
      const validationResult = await this.validationService.validateTip(
        parsedTip,
        matches.map((m) => m.id),
      );

      if (!validationResult.isValid) {
        throw new InternalServerErrorException(
          `Validation failed: ${validationResult.errors.join(", ")}`,
        );
      }

      if (validationResult.warnings.length > 0) {
        this.logger.warn(
          `Validation warnings: ${validationResult.warnings.join(", ")}`,
        );
      }

      // 7. Create tip entity
      const tip = await this.createTipFromParsed(
        parsedTip,
        matches,
        options,
        maturityScore,
      );

      const latency = Date.now() - startTime;
      this.logger.log(
        `AI tip generated successfully - Tip ID: ${tip.id}, Latency: ${latency}ms`,
      );

      return {
        tip,
        context: combinedContext,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(
        `Failed to generate AI tip after ${latency}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build context for a single match
   */
  private async buildContextForMatch(
    match: MatchData,
    competitionType: CompetitionType,
  ): Promise<OptimizedContext> {
    // Get all required data in parallel
    const [
      homeStats,
      awayStats,
      h2h,
      maturity,
      homeImportance,
      awayImportance,
      predictability,
    ] = await Promise.all([
      this.teamStatsRepository.findOne({
        where: {
          team: { id: match.homeTeam.id },
          league: match.league ? { id: match.league.id } : undefined,
        },
      }),
      this.teamStatsRepository.findOne({
        where: {
          team: { id: match.awayTeam.id },
          league: match.league ? { id: match.league.id } : undefined,
        },
      }),
      this.h2hRepository.findOne({
        where: {
          teamA: { id: match.homeTeam.id },
          teamB: { id: match.awayTeam.id },
          league: match.league ? { id: match.league.id } : undefined,
        },
      }),
      this.maturityRepository.findOne({
        where: {
          team: { id: match.homeTeam.id },
          league: match.league ? { id: match.league.id } : undefined,
        },
      }),
      this.importanceRepository.findOne({
        where: {
          team: { id: match.homeTeam.id },
          league: match.league ? { id: match.league.id } : undefined,
        },
      }),
      this.importanceRepository.findOne({
        where: {
          team: { id: match.awayTeam.id },
          league: match.league ? { id: match.league.id } : undefined,
        },
      }),
      this.predictabilityRepository.findOne({
        where: { match: { id: match.id } },
      }),
    ]);

    return await this.contextOptimizer.buildOptimizedContext(
      match,
      homeStats,
      awayStats,
      h2h,
      maturity,
      homeImportance,
      awayImportance,
      predictability,
      competitionType,
    );
  }

  /**
   * Combine contexts for multiple matches (accumulator)
   */
  private combineContexts(
    contexts: OptimizedContext[],
    matches: MatchData[],
  ): OptimizedContext {
    // For accumulator tips, combine the most important information
    const combined: OptimizedContext = {
      match: {
        id: "combined",
        homeTeam: `${matches.length} matches`,
        awayTeam: "Accumulator",
        league: contexts[0]?.match.league || "Multiple Leagues",
        date: matches[0]?.matchDatetime.toISOString() || new Date().toISOString(),
      },
      odds: {},
      historical: {
        homeTeamStats: `Analyzing ${matches.length} matches`,
      },
      importance: {
        combinedImportance: this.calculateAverageImportance(contexts),
      },
      predictability: {
        score: this.calculateAveragePredictability(contexts),
      },
      maturity: {
        score: this.calculateAverageMaturity(contexts),
        confidence: this.determineMaturityConfidence(contexts),
      },
      metadata: {
        tokenEstimate: contexts.reduce((sum, c) => sum + c.metadata.tokenEstimate, 0),
        dataQuality: this.determineOverallDataQuality(contexts),
      },
    };

    return combined;
  }

  /**
   * Parse AI response JSON
   */
  private parseAiResponse(
    responseText: string,
    matches: MatchData[],
  ): ParsedTip {
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;

      const parsed = JSON.parse(jsonText) as ParsedTip;

      // Validate structure
      if (!parsed.title || !parsed.selections || parsed.selections.length === 0) {
        throw new Error("Invalid response structure: missing required fields");
      }

      // Ensure all selections reference valid match IDs
      const validMatchIds = matches.map((m) => m.id);
      for (const selection of parsed.selections) {
        if (!validMatchIds.includes(selection.matchId)) {
          throw new Error(
            `Invalid match ID in selection: ${selection.matchId}`,
          );
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      this.logger.debug(`Response text: ${responseText.substring(0, 500)}`);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Create tip entity from parsed AI response
   */
  private async createTipFromParsed(
    parsedTip: ParsedTip,
    matches: MatchData[],
    options: GenerationOptions,
    maturityScore: number,
  ): Promise<Tip> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get or create AI tipster
      const aiTipster = await this.getOrCreateAiTipster(queryRunner);

      // Create tip
      const tip = queryRunner.manager.create(Tip, {
        tipster: aiTipster,
        isAi: true,
        title: parsedTip.title,
        description: parsedTip.description || parsedTip.reasoning,
        price: 0, // AI tips are free by default
        totalOdds: parsedTip.totalOdds,
        status: TipStatusType.PENDING,
        isPublished: options.autoPublish ?? false,
        aiConfidenceScore: parsedTip.confidence,
        aiReasoning: parsedTip.reasoning,
        aiModelVersion: "llama3.1:8b-instruct-q5_0",
        aiPromptVersion: this.promptService.getPromptVersion(),
        dataMaturityScore: maturityScore,
        autoGeneratedAt: new Date(),
        generationBatchId: options.batchId,
        earliestMatchDate: this.getEarliestMatchDate(matches),
      });

      const savedTip = await queryRunner.manager.save(Tip, tip);

      // Create tip selections
      for (const selection of parsedTip.selections) {
        const match = matches.find((m) => m.id === selection.matchId);
        if (!match) {
          this.logger.warn(
            `Match ${selection.matchId} not found, skipping selection`,
          );
          continue;
        }

        const tipSelection = queryRunner.manager.create(TipSelection, {
          tip: savedTip,
          match: match,
          predictionType: selection.predictionType,
          predictionValue: selection.predictionValue,
          odds: selection.odds,
        });

        await queryRunner.manager.save(TipSelection, tipSelection);
      }

      await queryRunner.commitTransaction();

      return savedTip;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get or create AI tipster
   */
  private async getOrCreateAiTipster(
    queryRunner: any,
  ): Promise<Tipster> {
    let aiTipster = await queryRunner.manager.findOne(Tipster, {
      where: { isAi: true },
    });

    if (!aiTipster) {
      aiTipster = queryRunner.manager.create(Tipster, {
        isAi: true,
        isVerified: true,
        isActive: true,
        totalTips: 0,
        successfulTips: 0,
        totalEarnings: 0,
        successRate: 0,
        rating: 0,
        bio: "AI-powered tipster using advanced machine learning models",
      });

      aiTipster = await queryRunner.manager.save(Tipster, aiTipster);
      this.logger.log("Created AI tipster entity");
    }

    return aiTipster;
  }

  /**
   * Helper methods for combining contexts
   */
  private calculateAverageMaturity(contexts: OptimizedContext[]): number {
    if (contexts.length === 0) return 0;
    const sum = contexts.reduce((acc, c) => acc + c.maturity.score, 0);
    return Math.round(sum / contexts.length);
  }

  private calculateAverageImportance(contexts: OptimizedContext[]): number {
    const importances = contexts
      .map((c) => c.importance.combinedImportance)
      .filter((v): v is number => v !== undefined);
    if (importances.length === 0) return 0;
    const sum = importances.reduce((acc, v) => acc + v, 0);
    return sum / importances.length;
  }

  private calculateAveragePredictability(contexts: OptimizedContext[]): number {
    const scores = contexts
      .map((c) => c.predictability.score)
      .filter((v): v is number => v !== undefined);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    return sum / scores.length;
  }

  private determineMaturityConfidence(
    contexts: OptimizedContext[],
  ): "low" | "medium" | "high" {
    const avgScore = this.calculateAverageMaturity(contexts);
    if (avgScore < 30) return "low";
    if (avgScore < 70) return "medium";
    return "high";
  }

  private determineOverallDataQuality(
    contexts: OptimizedContext[],
  ): "low" | "medium" | "high" {
    const qualities = contexts.map((c) => c.metadata.dataQuality);
    const highCount = qualities.filter((q) => q === "high").length;
    const mediumCount = qualities.filter((q) => q === "medium").length;

    if (highCount > qualities.length / 2) return "high";
    if (mediumCount + highCount > qualities.length / 2) return "medium";
    return "low";
  }

  private getEarliestMatchDate(matches: MatchData[]): Date {
    return new Date(
      Math.min(...matches.map((m) => m.matchDatetime.getTime())),
    );
  }
}
