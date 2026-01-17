import { ApiProperty } from "@nestjs/swagger";

export class TipsterBasicInfoDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "John Doe" })
  displayName?: string;

  @ApiProperty({ example: "https://example.com/avatar.png", required: false })
  avatarUrl?: string | null;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: 4.5 })
  rating: number;

  @ApiProperty({ example: 75.5 })
  successRate: number;

  @ApiProperty({ example: 150 })
  totalTips: number;
}

export class TipResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "EPL Weekend Acca" })
  title: string;

  @ApiProperty({ example: "Top picks for the weekend", required: false })
  description?: string | null;

  @ApiProperty({ example: 10.5 })
  price: number;

  @ApiProperty({ example: 15.75, required: false })
  totalOdds?: number | null;

  @ApiProperty({ example: "PENDING" })
  status: string;

  @ApiProperty({ example: 25 })
  purchasesCount: number;

  @ApiProperty({ example: "2024-01-15T10:00:00Z", required: false })
  publishedAt?: Date | null;

  @ApiProperty({ example: "2024-01-15T15:00:00Z", required: false })
  earliestMatchDate?: Date | null;

  @ApiProperty({ example: "2024-01-10T08:00:00Z" })
  createdAt: Date;

  @ApiProperty({ example: true, required: false })
  isPublished?: boolean;

  @ApiProperty({ type: TipsterBasicInfoDto, required: false })
  tipster?: TipsterBasicInfoDto | null;
}
