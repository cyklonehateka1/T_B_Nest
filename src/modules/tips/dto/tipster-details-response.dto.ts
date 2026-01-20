import { ApiProperty } from "@nestjs/swagger";

export class TipsterDetailsDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "John Smith" })
  name: string;

  @ApiProperty({
    example:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&auto=format",
    required: false,
  })
  avatar?: string | null;

  @ApiProperty({ example: 92 })
  rating: number;

  @ApiProperty({ example: "87%" })
  successRate: string;

  @ApiProperty({ example: 156 })
  totalTips: number;

  @ApiProperty({ example: 8, required: false })
  streak?: number;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({
    example:
      "Professional football analyst with over 10 years of experience. Specializing in Premier League and La Liga predictions.",
    required: false,
  })
  bio?: string | null;

  @ApiProperty({ example: "2023-01-15T00:00:00Z" })
  joinedAt: Date;

  @ApiProperty({
    example: "2024-01-15T10:15:00Z",
    required: false,
  })
  lastActive?: Date | null;
}
