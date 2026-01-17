import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { League } from "../../common/entities/league.entity";
import { LeagueResponseDto } from "./dto/league-response.dto";

@Injectable()
export class LeaguesService {
  private static readonly SOCCER_GROUP = "Soccer";

  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
  ) {}

  async getFootballLeagues(): Promise<LeagueResponseDto[]> {
    return this.getLeaguesBySportGroup(LeaguesService.SOCCER_GROUP);
  }

  async getLeaguesBySportGroup(
    sportGroup: string,
  ): Promise<LeagueResponseDto[]> {
    // Single optimized query with JOIN to avoid N+1 problem
    // This fetches all active leagues with their sport relationship in one query
    const leagues = await this.leagueRepository
      .createQueryBuilder("league")
      .innerJoinAndSelect("league.sport", "sport")
      .where("sport.sportGroup = :sportGroup", { sportGroup })
      .andWhere("league.isActive = :isActive", { isActive: true })
      .orderBy("league.name", "ASC")
      .getMany();

    return leagues.map((league) => this.mapToResponse(league));
  }

  private mapToResponse(league: League): LeagueResponseDto {
    const response = new LeagueResponseDto();
    response.id = league.id;
    response.externalId = league.externalId;
    response.name = league.name;
    response.description = null;

    // Country is included in the response for all leagues (always present, even if null)
    // Country may be null for international tournaments (e.g., UEFA Champions League)
    // Match Java @JsonInclude.ALWAYS behavior - always include field even if null
    response.country = league.country ?? null;
    response.logoUrl = league.logoUrl ?? null;

    response.isActive = league.isActive;

    // Sport is already eagerly loaded via JOIN, no additional query needed
    if (league.sport) {
      response.sportKey = league.sport.sportKey;
      response.sportGroup = league.sport.sportGroup;
    }

    return response;
  }
}
