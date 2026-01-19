import { ApiProperty } from "@nestjs/swagger";

export class TopTipsterDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "John Smith" })
  name: string;

  @ApiProperty({
    example: "https://example.com/avatar.png",
    required: false,
  })
  avatar?: string | null;

  @ApiProperty({ example: 92 })
  rating: number;

  @ApiProperty({ example: "87%" })
  successRate: string;

  @ApiProperty({ example: 156 })
  totalTips: number;

  @ApiProperty({ example: 8 })
  streak: number;

  @ApiProperty({ example: true })
  verified: boolean;
}

export class TopTipstersPageResponseDto {
  @ApiProperty({ type: [TopTipsterDto] })
  tipsters: TopTipsterDto[];

  @ApiProperty({ example: 50 })
  totalElements: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: 0 })
  currentPage: number;

  @ApiProperty({ example: 5 })
  pageSize: number;
}
