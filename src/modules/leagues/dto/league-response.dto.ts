import { ApiProperty } from "@nestjs/swagger";

export class LeagueResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "39", required: false })
  externalId?: string;

  @ApiProperty({ example: "Premier League" })
  name: string;

  @ApiProperty({ example: null, required: false })
  description?: string | null;

  @ApiProperty({ example: "England", required: false })
  country?: string | null;

  @ApiProperty({ example: "https://example.com/logo.png", required: false })
  logoUrl?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: "soccer_uk" })
  sportKey?: string;

  @ApiProperty({ example: "Soccer" })
  sportGroup?: string;
}
