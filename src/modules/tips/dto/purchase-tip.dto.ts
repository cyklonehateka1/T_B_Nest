import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class PurchaseTipDto {
  @ApiProperty({
    description: "Tip ID to purchase",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID(4, { message: "Tip ID must be a valid UUID" })
  @IsNotEmpty({ message: "Tip ID is required" })
  tipId: string;

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

  @ApiProperty({
    description: "Idempotency key to prevent duplicate payment requests (optional). If provided and a payment with this purchase exists, returns existing payment.",
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsUUID(4, { message: "Idempotency key must be a valid UUID" })
  @IsOptional()
  idempotencyKey?: string;
}
