import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CountrySettings } from "../../common/entities/country-settings.entity";
import { PaymentMethod } from "../../common/entities/payment-method.entity";
import { GlobalPaymentMethod } from "../../common/entities/global-payment-method.entity";
import { CountrySettingsResponseDto } from "./dto/country-settings-response.dto";
import { PaymentMethodResponseDto } from "./dto/payment-method-response.dto";
import { CountryDetectionService } from "../../common/services/country-detection.service";

@Injectable()
export class CountrySettingsService {
  private readonly logger = new Logger(CountrySettingsService.name);

  constructor(
    @InjectRepository(CountrySettings)
    private readonly countrySettingsRepository: Repository<CountrySettings>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(GlobalPaymentMethod)
    private readonly globalPaymentMethodRepository: Repository<GlobalPaymentMethod>,
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
      await Promise.all(
        paymentMethods.map(async (pm) => {
          let status: "active" | "inactive" = pm.enabled ? "active" : "inactive";

          // If payment method has a global payment method, check if it's enabled
          if (pm.globalPaymentMethodId) {
            const globalPaymentMethod =
              await this.globalPaymentMethodRepository.findOne({
                where: { id: pm.globalPaymentMethodId },
              });

            // If global payment method exists and is not enabled, set status to inactive
            if (globalPaymentMethod && !globalPaymentMethod.enabled) {
              status = "inactive";
            }
          }

          return {
            id: pm.id,
            name: pm.name,
            status,
            type: pm.type,
          };
        }),
      );

    // Build response DTO
    const response: CountrySettingsResponseDto = {
      id: countrySettings.id,
      countryCode: countrySettings.countryCode,
      name: countrySettings.name,
      flag: countrySettings.flag,
      paymentMethods: paymentMethodDtos,
    };

    return response;
  }
}
