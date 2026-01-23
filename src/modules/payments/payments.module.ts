import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "../../common/entities/payment.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { PaymentGateway } from "../../common/entities/payment-gateway.entity";
import { GlobalPaymentMethod } from "../../common/entities/global-payment-method.entity";
import { PaymentStatusScheduler } from "./payment-status.scheduler";
import { PaymentGatewayRegistryService } from "./gateways/payment-gateway-registry.service";
import { PalmpayService } from "./gateways/palmpay/palmpay.service";
import { PaymentResponseValidatorService } from "../../common/services/payment-response-validator.service";
import { WebhookService } from "../../common/services/webhook.service";
import { EmailModule } from "../email/email.module";
import { TipEvaluationModule } from "../tip-evaluation/tip-evaluation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Purchase,
      PaymentGateway,
      GlobalPaymentMethod,
    ]),
    EmailModule,
    forwardRef(() => TipEvaluationModule),
  ],
  providers: [
    PaymentStatusScheduler,
    PaymentGatewayRegistryService,
    PalmpayService,
    PaymentResponseValidatorService,
    WebhookService,
  ],
  exports: [PaymentStatusScheduler, PalmpayService],
})
export class PaymentsModule {}
