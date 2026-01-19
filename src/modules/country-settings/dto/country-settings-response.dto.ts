import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethodResponseDto } from "./payment-method-response.dto";
import { FeeResponseDto } from "./fee-response.dto";

export class CountrySettingsResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Country settings ID",
  })
  id: string;

  @ApiProperty({
    example: "GH",
    description: "Country code (ISO 3166-1 alpha-2)",
  })
  countryCode: string;

  @ApiProperty({
    example: "Ghana",
    description: "Country name",
  })
  name: string;

  @ApiProperty({
    example: "🇬🇭",
    description: "Country flag emoji",
  })
  flag: string;

  @ApiPropertyOptional({
    example: "GHS",
    description: "Local currency code (ISO 4217)",
  })
  localCurrencyCode?: string;

  @ApiPropertyOptional({
    example: 0.08,
    description:
      "Exchange rate from local currency to USD. Multiply local currency amount by this rate to get USD equivalent (e.g., 1 GHS = 0.08 USD)",
  })
  localCurrencyToUsdRate?: number;

  @ApiProperty({
    type: [PaymentMethodResponseDto],
    description: "Available payment methods for this country",
  })
  paymentMethods: PaymentMethodResponseDto[];

  @ApiProperty({
    type: [FeeResponseDto],
    description: "Fees and taxes applicable for this country",
  })
  fees: FeeResponseDto[];
}
