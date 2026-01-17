import { Controller, Get, Query, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MatchesService } from "./matches.service";
import { MatchBasicResponseDto } from "./dto/match-basic-response.dto";
import { MatchDetailedResponseDto } from "./dto/match-detailed-response.dto";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";

@ApiTags("Matches")
@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get("upcoming")
  @ApiOperation({
    summary: "Get upcoming matches",
    description:
      "Retrieve upcoming matches, optionally filtered by league. Returns basic match info for regular users, detailed info with odds for tipsters.",
  })
  @ApiQuery({
    name: "leagueId",
    required: false,
    description: "UUID of the league to filter matches by",
    example: "683bdda2-b79f-44a0-a2d5-569e27c09583",
  })
  @ApiQuery({
    name: "leagueExternalId",
    required: false,
    description: "External ID of the league to filter matches by",
    example: "soccer_spain_la_liga",
  })
  @ApiResponse({
    status: 200,
    description: "Upcoming matches retrieved successfully",
    type: [MatchBasicResponseDto],
    schema: {
      example: {
        success: true,
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            externalId: "12345",
            league: {
              id: "683bdda2-b79f-44a0-a2d5-569e27c09583",
              externalId: "39",
              name: "Premier League",
              logoUrl: "https://example.com/logo.png",
              country: "England",
            },
            homeTeam: {
              id: "550e8400-e29b-41d4-a716-446655440001",
              name: "Manchester United",
              shortName: "Man Utd",
              logoUrl: "https://example.com/logo.png",
            },
            awayTeam: {
              id: "550e8400-e29b-41d4-a716-446655440002",
              name: "Liverpool",
              shortName: "Liverpool",
              logoUrl: "https://example.com/logo.png",
            },
            matchDate: "2024-01-15T15:00:00Z",
            status: "scheduled",
            venue: "Old Trafford",
            round: "Round 1",
            season: "2023/2024",
          },
        ],
        message: "Upcoming matches retrieved successfully",
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      "Upcoming matches with odds retrieved successfully (for tipsters)",
    type: [MatchDetailedResponseDto],
  })
  async getUpcomingMatches(
    @Query("leagueId") leagueId?: string,
    @Query("leagueExternalId") leagueExternalId?: string,
    @Request() req?: any,
  ): Promise<
    ApiResponseClass<Array<MatchBasicResponseDto | MatchDetailedResponseDto>>
  > {
    // Check if user is a tipster (defaults to false for unauthenticated users)
    const isTipster = this.isUserTipster(req);

    let matches: Array<MatchBasicResponseDto | MatchDetailedResponseDto>;

    if (leagueExternalId && leagueExternalId.trim() !== "") {
      matches = await this.matchesService.getUpcomingMatchesByLeagueExternalId(
        leagueExternalId,
        isTipster,
      );
    } else {
      matches = await this.matchesService.getUpcomingMatches(
        leagueId,
        isTipster,
      );
    }

    const message = isTipster
      ? "Upcoming matches with odds retrieved successfully"
      : "Upcoming matches retrieved successfully";

    return ApiResponseClass.success(matches, message);
  }

  /**
   * Check if the authenticated user is a tipster
   * Returns false for unauthenticated users (they get basic match info)
   */
  private isUserTipster(req: any): boolean {
    if (!req || !req.user || !req.user.roles) {
      return false;
    }

    // Check if user has TIPSTER role
    return req.user.roles.includes("TIPSTER") || req.user.role === "TIPSTER";
  }
}
