import { ApiProperty } from "@nestjs/swagger";
import { PurchaseStatusType } from "../../../common/enums/purchase-status-type.enum";

export class PurchaseTipResponseDto {
  @ApiProperty({
    description: "Purchase ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Tip ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  tipId: string;

  @ApiProperty({
    description: "Buyer ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  buyerId: string;

  @ApiProperty({
    description: "Purchase amount",
    example: 10.5,
  })
  amount: number;

  @ApiProperty({
    description: "Purchase status",
    enum: PurchaseStatusType,
    example: PurchaseStatusType.PENDING,
  })
  status: PurchaseStatusType;

  @ApiProperty({
    description: "Payment reference",
    example: "TXN123456789",
    required: false,
  })
  paymentReference?: string;

  @ApiProperty({
    description: "Payment method",
    example: "mobile_money",
    required: false,
  })
  paymentMethod?: string;

  @ApiProperty({
    description: "Payment gateway",
    example: "palmpay",
    required: false,
  })
  paymentGateway?: string;

  @ApiProperty({
    description: "Checkout URL for payment (if applicable)",
    example: "https://payment.palmpay.com/checkout/...",
    required: false,
  })
  checkoutUrl?: string;

  @ApiProperty({
    description: "Transaction ID from payment gateway",
    example: "PALM123456789",
    required: false,
  })
  transactionId?: string;

  @ApiProperty({
    description: "Payment status message",
    example: "Payment initiated successfully",
    required: false,
  })
  message?: string;
}
