import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for app settings response (customer-facing)
 * Only includes non-sensitive settings needed by the customer app
 */
export class AppSettingsCustomerResponseDto {
  @ApiProperty({
    example: 1.0,
    description: "Minimum tip price in USD",
  })
  tipMinPrice: number;

  @ApiProperty({
    example: 100.0,
    description: "Maximum tip price in USD",
  })
  tipMaxPrice: number;

  @ApiProperty({
    example: 50,
    description: "Maximum number of selections allowed per tip",
  })
  maxSelectionsPerTip: number;

  @ApiProperty({
    example: true,
    description: "Whether tip purchases are enabled",
  })
  enableTipPurchases: boolean;

  @ApiProperty({
    example: true,
    description: "Whether free tips (price = 0) are allowed",
  })
  enableFreeTips: boolean;

  @ApiProperty({
    example: false,
    description: "Whether maintenance mode is active",
  })
  maintenanceMode: boolean;

  @ApiProperty({
    example: "We are currently performing maintenance. Please check back soon.",
    required: false,
    description: "Message to display during maintenance mode",
  })
  maintenanceMessage?: string;

  @ApiProperty({
    example: true,
    description: "Whether new tipster registrations are enabled",
  })
  enableNewTipsterRegistrations: boolean;
}
