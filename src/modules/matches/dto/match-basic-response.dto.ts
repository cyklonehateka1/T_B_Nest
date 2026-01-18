import { ApiProperty } from "@nestjs/swagger";
export class LeagueBasicInfoDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;
  @ApiProperty({ example: "39", required: false })
  externalId?: string;
  @ApiProperty({ example: "Premier League" })
  name: string;
  @ApiProperty({ example: "https://tipster.bet/logos/premier-league.png" })
  logoUrl?: string | null;
  @ApiProperty({ example: "England", required: false })
  country?: string | null;
}
export class TeamBasicInfoDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;
  @ApiProperty({ example: "Manchester United" })
  name: string;
  @ApiProperty({ example: "Man Utd", required: false })
  shortName?: string | null;
  @ApiProperty({ example: "https://tipster.bet/logos/manchester-united.png" })
  logoUrl?: string | null;
}
export class MatchBasicResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;
  @ApiProperty({ example: "12345", required: false })
  externalId?: string;
  @ApiProperty({ type: LeagueBasicInfoDto, required: false })
  league?: LeagueBasicInfoDto | null;
  @ApiProperty({ type: TeamBasicInfoDto, required: false })
  homeTeam?: TeamBasicInfoDto | null;
  @ApiProperty({ type: TeamBasicInfoDto, required: false })
  awayTeam?: TeamBasicInfoDto | null;
  @ApiProperty({ example: "2024-01-15T15:00:00Z" })
  matchDate: Date;
  @ApiProperty({ example: "scheduled" })
  status: string;
  @ApiProperty({ example: "Old Trafford", required: false })
  venue?: string | null;
  @ApiProperty({ example: "Round 1", required: false })
  round?: string | null;
  @ApiProperty({ example: "2023/2024", required: false })
  season?: string | null;
}
