import { ApiProperty } from "@nestjs/swagger";

export class FeeResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Fee ID",
  })
  id: string;

  @ApiProperty({
    example: "VAT",
    description: "Fee name",
  })
  name: string;

  @ApiProperty({
    example: "Value Added Tax",
    description: "Fee description",
  })
  description: string;

  @ApiProperty({
    example: "tax",
    description: "Fee type",
    enum: ["tax", "fee"],
  })
  type: string;

  @ApiProperty({
    example: true,
    description: "Whether the fee is enabled",
  })
  enabled: boolean;

  @ApiProperty({
    example: "exclusive",
    description: "Tax type (if applicable)",
    enum: ["inclusive", "exclusive"],
    required: false,
  })
  taxType?: string;

  @ApiProperty({
    example: 12.5,
    description: "Tax rate percentage (if applicable)",
    required: false,
  })
  taxRate?: number;

  @ApiProperty({
    example: "percentage",
    description: "Fee calculation type",
    enum: ["percentage", "fixed"],
    required: false,
  })
  feeCalculationType?: string;

  @ApiProperty({
    example: 2.5,
    description: "Fee value (percentage or fixed amount)",
    required: false,
  })
  feeValue?: number;
}
