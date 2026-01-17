import { ApiProperty } from "@nestjs/swagger";
import {
  LeagueBasicInfoDto,
  TeamBasicInfoDto,
} from "./match-basic-response.dto";
export class OddsValueDto {
  @ApiProperty({ example: 2.5, required: false })
  home?: number;
  @ApiProperty({ example: 3.2, required: false })
  draw?: number;
  @ApiProperty({ example: 2.8, required: false })
  away?: number;
  @ApiProperty({ example: 1.9, required: false })
  yes?: number;
  @ApiProperty({ example: 1.9, required: false })
  no?: number;
  @ApiProperty({ example: 1.4, required: false })
  homeOrDraw?: number;
  @ApiProperty({ example: 1.3, required: false })
  homeOrAway?: number;
  @ApiProperty({ example: 1.5, required: false })
  drawOrAway?: number;
}
export class OverUnderOddsDto {
  @ApiProperty({ example: 2.5 })
  line: number;
  @ApiProperty({ example: 1.8 })
  over: number;
  @ApiProperty({ example: 2.0 })
  under: number;
}
export class HandicapOddsDto {
  @ApiProperty({ example: -1.5 })
  line: number;
  @ApiProperty({ example: 2.2 })
  home: number;
  @ApiProperty({ example: 1.7 })
  away: number;
}
export class MatchOddsDto {
  @ApiProperty({
    type: OddsValueDto,
    required: false,
    description: "Match Result (1X2)",
  })
  matchResult?: OddsValueDto | null;
  @ApiProperty({
    type: [OverUnderOddsDto],
    required: false,
    description: "Over/Under",
  })
  overUnder?: OverUnderOddsDto[] | null;
  @ApiProperty({
    type: OddsValueDto,
    required: false,
    description: "Both Teams to Score",
  })
  bothTeamsToScore?: OddsValueDto | null;
  @ApiProperty({
    type: OddsValueDto,
    required: false,
    description: "Double Chance",
  })
  doubleChance?: OddsValueDto | null;
  @ApiProperty({
    type: [HandicapOddsDto],
    required: false,
    description: "Handicap",
  })
  handicap?: HandicapOddsDto[] | null;
  @ApiProperty({
    type: Object,
    required: false,
    description: "Additional markets",
  })
  otherMarkets?: Record<string, any> | null;
}
export class MatchDetailedResponseDto {
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
  @ApiProperty({
    type: MatchOddsDto,
    required: false,
    description: "Odds data for tipsters",
  })
  odds?: MatchOddsDto | null;
}
