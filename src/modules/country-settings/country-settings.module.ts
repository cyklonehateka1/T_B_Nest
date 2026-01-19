import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CountrySettings } from "../../common/entities/country-settings.entity";
import { PaymentMethod } from "../../common/entities/payment-method.entity";
import { GlobalPaymentMethod } from "../../common/entities/global-payment-method.entity";
import { Fee } from "../../common/entities/fee.entity";
import { CountrySettingsController } from "./country-settings.controller";
import { CountrySettingsService } from "./country-settings.service";
import { CountryDetectionService } from "../../common/services/country-detection.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CountrySettings,
      PaymentMethod,
      GlobalPaymentMethod, // Still needed for relations to work properly
      Fee,
    ]),
  ],
  controllers: [CountrySettingsController],
  providers: [CountrySettingsService, CountryDetectionService],
  exports: [CountrySettingsService, CountryDetectionService],
})
export class CountrySettingsModule {}
