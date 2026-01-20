import { ApiProperty } from "@nestjs/swagger";
import { PaymentMethodType } from "../../../common/entities/payment-method.entity";

export class PaymentMethodResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Payment method ID",
  })
  id: string;

  @ApiProperty({
    example: "Mobile Money",
    description: "Payment method name",
  })
  name: string;

  @ApiProperty({
    example: "active",
    description:
      "Payment method status (active or inactive). Inactive if global payment method is disabled.",
    enum: ["active", "inactive"],
  })
  status: "active" | "inactive";

  @ApiProperty({
    example: "mobile_money",
    description: "Payment method type",
    enum: PaymentMethodType,
  })
  type: PaymentMethodType;
}
