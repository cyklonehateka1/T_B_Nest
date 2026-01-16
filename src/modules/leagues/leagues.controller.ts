import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { LeaguesService } from "./leagues.service";
import { LeagueResponseDto } from "./dto/league-response.dto";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";

@ApiTags("Leagues")
@Controller("leagues")
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get("football")
  @ApiOperation({
    summary: "Get football leagues",
    description:
      "Retrieve all active football (soccer) leagues from the database.",
  })
  @ApiResponse({
    status: 200,
    description: "Football leagues retrieved successfully",
    type: [LeagueResponseDto],
    schema: {
      example: {
        success: true,
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            externalId: "39",
            name: "Premier League",
            description: null,
            country: "England",
            logoUrl: "https://example.com/logo.png",
            isActive: true,
            sportKey: "soccer_uk",
            sportGroup: "Soccer",
          },
        ],
        message: "Football leagues retrieved successfully",
      },
    },
  })
  async getFootballLeagues(): Promise<ApiResponseClass<LeagueResponseDto[]>> {
    const leagues = await this.leaguesService.getFootballLeagues();
    return ApiResponseClass.success(
      leagues,
      "Football leagues retrieved successfully"
    );
  }

  @Get()
  @ApiOperation({
    summary: "Get leagues by sport group",
    description:
      "Retrieve all active leagues, optionally filtered by sport group. Defaults to football if no sport group is specified.",
  })
  @ApiQuery({
    name: "sportGroup",
    required: false,
    description: 'Sport group to filter leagues by (e.g., "Soccer")',
    example: "Soccer",
  })
  @ApiResponse({
    status: 200,
    description: "Leagues retrieved successfully",
    type: [LeagueResponseDto],
    schema: {
      example: {
        success: true,
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            externalId: "39",
            name: "Premier League",
            description: null,
            country: "England",
            logoUrl: "https://example.com/logo.png",
            isActive: true,
            sportKey: "soccer_uk",
            sportGroup: "Soccer",
          },
        ],
        message: "Leagues retrieved successfully",
      },
    },
  })
  async getLeagues(
    @Query("sportGroup") sportGroup?: string
  ): Promise<ApiResponseClass<LeagueResponseDto[]>> {
    let leagues: LeagueResponseDto[];

    if (sportGroup && sportGroup.trim() !== "") {
      leagues = await this.leaguesService.getLeaguesBySportGroup(sportGroup);
    } else {
      // Default to football if no sport group specified
      leagues = await this.leaguesService.getFootballLeagues();
    }

    return ApiResponseClass.success(leagues, "Leagues retrieved successfully");
  }
}
