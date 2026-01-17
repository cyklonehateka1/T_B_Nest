import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppSettingsService } from "./app-settings.service";
import { AppSettingsCustomerResponseDto } from "./dto/app-settings-customer-response.dto";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";
@ApiTags("App Settings")
@Controller("app-settings")
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}
  @Get("customer")
  @ApiOperation({
    summary: "Get app settings for customer app",
    description:
      "Retrieve public app settings needed by the customer frontend. Returns only non-sensitive configuration data.",
  })
  @ApiResponse({
    status: 200,
    description: "App settings retrieved successfully",
    type: AppSettingsCustomerResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          tipMinPrice: 1.0,
          tipMaxPrice: 100.0,
          maxSelectionsPerTip: 50,
          enableTipPurchases: true,
          enableFreeTips: true,
          maintenanceMode: false,
          maintenanceMessage: null,
          enableNewTipsterRegistrations: true,
        },
        message: "App settings retrieved successfully",
      },
    },
  })
  async getCustomerAppSettings(): Promise<
    ApiResponseClass<AppSettingsCustomerResponseDto>
  > {
    const settings = await this.appSettingsService.getCustomerAppSettings();
    return ApiResponseClass.success(
      settings,
      "App settings retrieved successfully",
    );
  }
}
