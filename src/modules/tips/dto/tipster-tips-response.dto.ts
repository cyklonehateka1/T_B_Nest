import { ApiProperty } from "@nestjs/swagger";

export class TipsterTipDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "Premier League Double" })
  title: string;

  @ApiProperty({ example: 4.99 })
  price: number;

  @ApiProperty({ example: "won", enum: ["pending", "won", "lost", "void", "cancelled"] })
  status: string;

  @ApiProperty({ example: "92%" })
  successRate: string;

  @ApiProperty({ example: "2024-01-15T10:00:00Z" })
  createdAt: Date;
}

export class TipsterTipsResponseDto {
  @ApiProperty({ type: [TipsterTipDto] })
  tips: TipsterTipDto[];
}
