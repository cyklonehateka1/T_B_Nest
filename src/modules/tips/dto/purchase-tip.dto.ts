import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class PurchaseTipDto {
  @ApiProperty({
    description: "Payment method to use (e.g., 'mobile_money')",
    example: "mobile_money",
  })
  @IsString({ message: "Payment method must be a string" })
  @IsNotEmpty({ message: "Payment method is required" })
  paymentMethod: string;

  @ApiProperty({
    description: "Payment gateway to use (e.g., 'palmpay')",
    example: "palmpay",
    required: false,
  })
  @IsString({ message: "Payment gateway must be a string" })
  @IsOptional()
  paymentGateway?: string;

  @ApiProperty({
    description: "Currency for the payment (e.g., 'GHS', 'USD')",
    example: "GHS",
    required: false,
  })
  @IsString({ message: "Currency must be a string" })
  @IsOptional()
  currency?: string;
}
