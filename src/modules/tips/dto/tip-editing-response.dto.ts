import { ApiProperty } from "@nestjs/swagger";
import { TipsterBasicInfoDto } from "./tip-response.dto";

export class MatchTeamDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "Manchester United" })
  name: string;

  @ApiProperty({ example: "MUN", required: false })
  shortName?: string;

  @ApiProperty({ example: "https://example.com/logo.png", required: false })
  logoUrl?: string;

  @ApiProperty({ example: "England", required: false })
  country?: string;
}

export class MatchLeagueDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "Premier League" })
  name: string;

  @ApiProperty({ example: "England", required: false })
  country?: string;

  @ApiProperty({ example: "https://example.com/logo.png", required: false })
  logoUrl?: string;
}

export class MatchDetailsDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "2024-01-15T15:00:00Z" })
  matchDatetime: Date;

  @ApiProperty({ example: "scheduled" })
  status: string;

  @ApiProperty({ type: MatchTeamDto })
  homeTeam: MatchTeamDto;

  @ApiProperty({ type: MatchTeamDto })
  awayTeam: MatchTeamDto;

  @ApiProperty({ type: MatchLeagueDto, required: false })
  league?: MatchLeagueDto;

  @ApiProperty({ example: 2, required: false })
  homeScore?: number;

  @ApiProperty({ example: 1, required: false })
  awayScore?: number;

  @ApiProperty({ example: "Old Trafford", required: false })
  venue?: string;

  @ApiProperty({ example: "Round 20", required: false })
  round?: string;
}

export class TipSelectionEditingDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  matchId: string;

  @ApiProperty({ example: "match_result" })
  predictionType: string;

  @ApiProperty({ example: "home_win" })
  predictionValue: string;

  @ApiProperty({ example: 2.5 })
  odds?: number;

  @ApiProperty({ example: false })
  isVoid: boolean;

  @ApiProperty({ type: MatchDetailsDto, required: false })
  match?: MatchDetailsDto;
}
export class TipEditingResponseDto {
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
  @ApiProperty({ example: 0 })
  purchasesCount: number;
  @ApiProperty({ example: "2024-01-15T15:00:00Z", required: false })
  earliestMatchDate?: Date | null;
  @ApiProperty({ example: "2024-01-10T08:00:00Z" })
  createdAt: Date;
  @ApiProperty({ type: [TipSelectionEditingDto] })
  selections: TipSelectionEditingDto[];
  @ApiProperty({ type: TipsterBasicInfoDto, required: false })
  tipster?: TipsterBasicInfoDto | null;
}
