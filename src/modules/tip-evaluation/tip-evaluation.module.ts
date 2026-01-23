import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { Tip } from "../../common/entities/tip.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { Escrow } from "../../common/entities/escrow.entity";
import { Payment } from "../../common/entities/payment.entity";
import { AppSettings } from "../../common/entities/app-settings.entity";
import { PredictionEvaluationService } from "./prediction-evaluation.service";
import { TipSelectionEvaluationScheduler } from "./tip-selection-evaluation.scheduler";
import { TipOutcomeDeterminationScheduler } from "./tip-outcome-determination.scheduler";
import { EscrowSettlementScheduler } from "./escrow-settlement.scheduler";
import { EscrowService } from "./escrow.service";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipSelection,
      MatchData,
      Tip,
      Purchase,
      Escrow,
      Payment,
      AppSettings,
    ]),
    forwardRef(() => PaymentsModule),
  ],
  providers: [
    PredictionEvaluationService,
    TipSelectionEvaluationScheduler,
    TipOutcomeDeterminationScheduler,
    EscrowSettlementScheduler,
    EscrowService,
  ],
  exports: [EscrowService, PredictionEvaluationService],
})
export class TipEvaluationModule {}
