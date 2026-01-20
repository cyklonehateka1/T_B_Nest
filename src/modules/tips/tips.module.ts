import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TipsController } from "./tips.controller";
import { TipsService } from "./tips.service";
import { Tip } from "../../common/entities/tip.entity";
import { Tipster } from "../../common/entities/tipster.entity";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { User } from "../../common/entities/user.entity";
import { AppSettings } from "../../common/entities/app-settings.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { PaymentGatewayRegistryService } from "../payments/gateways/payment-gateway-registry.service";
import { PaymentGateway } from "../../common/entities/payment-gateway.entity";
import { GlobalPaymentMethod } from "../../common/entities/global-payment-method.entity";
import { Payment } from "../../common/entities/payment.entity";
import { PalmpayService } from "../payments/gateways/palmpay/palmpay.service";
import { PaymentResponseValidatorService } from "../../common/services/payment-response-validator.service";
import { WebhookService } from "../../common/services/webhook.service";
import { EmailModule } from "../email/email.module";
import { CountrySettingsModule } from "../country-settings/country-settings.module";
import { CountrySettings } from "../../common/entities/country-settings.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tip,
      Tipster,
      TipSelection,
      MatchData,
      User,
      AppSettings,
      Purchase,
      PaymentGateway,
      GlobalPaymentMethod,
      Payment,
      CountrySettings,
    ]),
    EmailModule,
    CountrySettingsModule,
  ],
  controllers: [TipsController],
  providers: [
    TipsService,
    PaymentGatewayRegistryService,
    PalmpayService,
    PaymentResponseValidatorService,
    WebhookService,
  ],
  exports: [TipsService],
})
export class TipsModule {}
