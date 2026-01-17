import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppSettings } from "../../common/entities/app-settings.entity";
import { AppSettingsCustomerResponseDto } from "./dto/app-settings-customer-response.dto";

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(
    @InjectRepository(AppSettings)
    private readonly appSettingsRepository: Repository<AppSettings>,
  ) {}

  /**
   * Get active app settings for customer app
   * Returns only non-sensitive settings needed by the frontend
   */
  async getCustomerAppSettings(): Promise<AppSettingsCustomerResponseDto> {
    this.logger.debug("Fetching customer app settings");

    // Get active app settings (singleton pattern - should only have one active record)
    const settings = await this.appSettingsRepository.findOne({
      where: { isActive: true },
      order: { updatedAt: "DESC" }, // Get most recently updated if multiple exist
    });

    if (!settings) {
      // Return defaults if no settings found
      this.logger.warn(
        "No active app settings found, returning default values",
      );
      return {
        tipMinPrice: 1.0,
        tipMaxPrice: 100.0,
        maxSelectionsPerTip: 50,
        enableTipPurchases: true,
        enableFreeTips: true,
        maintenanceMode: false,
        maintenanceMessage: undefined,
        enableNewTipsterRegistrations: true,
      };
    }

    // Map to customer-facing DTO (only non-sensitive fields)
    const response = new AppSettingsCustomerResponseDto();
    response.tipMinPrice = parseFloat(settings.tipMinPrice.toString());
    response.tipMaxPrice = parseFloat(settings.tipMaxPrice.toString());
    response.maxSelectionsPerTip = settings.maxSelectionsPerTip;
    response.enableTipPurchases = settings.enableTipPurchases;
    response.enableFreeTips = settings.enableFreeTips;
    response.maintenanceMode = settings.maintenanceMode;
    response.maintenanceMessage = settings.maintenanceMessage || undefined;
    response.enableNewTipsterRegistrations =
      settings.enableNewTipsterRegistrations;

    return response;
  }
}
