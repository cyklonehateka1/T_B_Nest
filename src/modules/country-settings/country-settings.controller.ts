import { Controller, Get, Req, UseGuards, Logger } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CountrySettingsService } from "./country-settings.service";
import { CountrySettingsResponseDto } from "./dto/country-settings-response.dto";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";

@ApiTags("Country Settings")
@Controller("country-settings")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CountrySettingsController {
  private readonly logger = new Logger(CountrySettingsController.name);

  constructor(
    private readonly countrySettingsService: CountrySettingsService,
  ) {}

  @Get("current")
  @ApiOperation({
    summary: "Get country settings for current user",
    description:
      "Detects the user's country from their IP address and returns the corresponding country settings including available payment methods. Payment methods are only active if both the country-specific and global payment methods are enabled.",
  })
  @ApiResponse({
    status: 200,
    description: "Country settings retrieved successfully",
    type: CountrySettingsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Country settings not found for detected country",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Authentication required",
  })
  async getCurrentCountrySettings(
    @Req() req: Request,
  ): Promise<ApiResponseClass<CountrySettingsResponseDto>> {
    const ipAddress = this.extractUserIP(req);
    this.logger.debug(`Getting country settings for IP: ${ipAddress}`);

    const countrySettings =
      await this.countrySettingsService.getCountrySettingsByIP(ipAddress);

    return ApiResponseClass.success(
      countrySettings,
      "Country settings retrieved successfully",
    );
  }

  private extractUserIP(req: Request): string {
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.headers["x-real-ip"]?.toString() ||
      req.headers["x-client-ip"]?.toString() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    return ip.trim();
  }
}
