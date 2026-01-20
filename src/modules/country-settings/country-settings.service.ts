import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CountrySettings } from "../../common/entities/country-settings.entity";
import { PaymentMethod } from "../../common/entities/payment-method.entity";
import { Fee } from "../../common/entities/fee.entity";
import { CountrySettingsResponseDto } from "./dto/country-settings-response.dto";
import { PaymentMethodResponseDto } from "./dto/payment-method-response.dto";
import { FeeResponseDto } from "./dto/fee-response.dto";
import { CountryDetectionService } from "../../common/services/country-detection.service";

@Injectable()
export class CountrySettingsService {
  private readonly logger = new Logger(CountrySettingsService.name);

  constructor(
    @InjectRepository(CountrySettings)
    private readonly countrySettingsRepository: Repository<CountrySettings>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Fee)
    private readonly feeRepository: Repository<Fee>,
    private readonly countryDetectionService: CountryDetectionService,
  ) {}

  async getCountrySettingsByIP(
    ipAddress: string,
  ): Promise<CountrySettingsResponseDto> {
    this.logger.debug(`Detecting country for IP: ${ipAddress}`);

    // Detect country from IP
    const detectionResult =
      await this.countryDetectionService.detectCountryFromIP(ipAddress);

    // Find country settings by country code
    const countrySettings = await this.countrySettingsRepository.findOne({
      where: { countryCode: detectionResult.countryCode },
    });

    if (!countrySettings) {
      this.logger.warn(
        `Country settings not found for country code: ${detectionResult.countryCode}`,
      );
      throw new NotFoundException(
        `Country settings not found for country: ${detectionResult.countryCode}`,
      );
    }

    // Fetch all payment methods for this country with their global payment methods
    const paymentMethods = await this.paymentMethodRepository.find({
      where: { countrySettingsId: countrySettings.id },
      relations: ["globalPaymentMethod"],
    });

    // Map payment methods to response DTOs with proper status logic
    const paymentMethodDtos: PaymentMethodResponseDto[] =
      paymentMethods.map((pm) => {
        let status: "active" | "inactive" = pm.enabled ? "active" : "inactive";

        // If payment method has a global payment method, check if it's enabled
        // The global payment method is already loaded via relations
        if (pm.globalPaymentMethod) {
          // If global payment method is not enabled, set status to inactive
          if (!pm.globalPaymentMethod.enabled) {
            status = "inactive";
          }
        }

        return {
          id: pm.id,
          name: pm.name,
          status,
          type: pm.type,
        };
      });

    // Fetch all fees for this country
    const fees = await this.feeRepository.find({
      where: { countrySettingsId: countrySettings.id },
    });

    // Map fees to response DTOs (only return enabled fees, but include all for display)
    const feeDtos: FeeResponseDto[] = fees.map((fee) => ({
      id: fee.id,
      name: fee.name,
      description: fee.description,
      type: fee.type,
      enabled: fee.enabled,
      taxType: fee.taxType,
      taxRate: fee.taxRate ? parseFloat(fee.taxRate.toString()) : undefined,
      feeCalculationType: fee.feeCalculationType,
      feeValue: fee.feeValue ? parseFloat(fee.feeValue.toString()) : undefined,
    }));

    // Build response DTO
    const response: CountrySettingsResponseDto = {
      id: countrySettings.id,
      countryCode: countrySettings.countryCode,
      name: countrySettings.name,
      flag: countrySettings.flag,
      localCurrencyCode: countrySettings.localCurrencyCode,
      localCurrencyToUsdRate: countrySettings.localCurrencyToUsdRate
        ? parseFloat(countrySettings.localCurrencyToUsdRate.toString())
        : undefined,
      paymentMethods: paymentMethodDtos,
      fees: feeDtos,
    };

    return response;
  }
}
