import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tip } from "../../common/entities/tip.entity";
import { Tipster } from "../../common/entities/tipster.entity";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { TeamStatistics } from "../../common/entities/team-statistics.entity";
import { TeamHeadToHead } from "../../common/entities/team-head-to-head.entity";
import { DataMaturityScore } from "../../common/entities/data-maturity-score.entity";
import { TeamImportanceRating } from "../../common/entities/team-importance-rating.entity";
import { MatchPredictabilityScore } from "../../common/entities/match-predictability-score.entity";
import { AiTipGenerationQueue } from "../../common/entities/ai-tip-generation-queue.entity";
import { OllamaClientService } from "./services/ollama-client.service";
import { ContextOptimizerService } from "./services/context-optimizer.service";
import { PromptTemplateService } from "./services/prompt-template.service";
import { TipValidationService } from "./services/tip-validation.service";
import { AiTipGenerationService } from "./services/ai-tip-generation.service";
import { MatchSelectionService } from "./services/match-selection.service";
import { WeekendLeagueTipsScheduler } from "./schedulers/weekend-league-tips.scheduler";
import { ChampionsLeagueTipsScheduler } from "./schedulers/champions-league-tips.scheduler";
import { EuropaLeagueTipsScheduler } from "./schedulers/europa-league-tips.scheduler";
import { InternationalCompetitionsTipsScheduler } from "./schedulers/international-competitions-tips.scheduler";
import { League } from "../../common/entities/league.entity";
import { AppSettings } from "../../common/entities/app-settings.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tip,
      Tipster,
      TipSelection,
      MatchData,
      TeamStatistics,
      TeamHeadToHead,
      DataMaturityScore,
      TeamImportanceRating,
      MatchPredictabilityScore,
      AiTipGenerationQueue,
      League,
      AppSettings,
    ]),
  ],
  providers: [
    OllamaClientService,
    ContextOptimizerService,
    PromptTemplateService,
    TipValidationService,
    MatchSelectionService,
    AiTipGenerationService,
    WeekendLeagueTipsScheduler,
    ChampionsLeagueTipsScheduler,
    EuropaLeagueTipsScheduler,
    InternationalCompetitionsTipsScheduler,
  ],
  exports: [
    AiTipGenerationService,
    OllamaClientService,
    ContextOptimizerService,
    PromptTemplateService,
    MatchSelectionService,
  ],
})
export class AiTipGenerationModule {}
