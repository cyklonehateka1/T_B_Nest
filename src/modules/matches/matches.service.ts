import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { MatchData } from "../../common/entities/match-data.entity";
import { MatchStatusType } from "../../common/enums/match-status-type.enum";
import {
  MatchBasicResponseDto,
  LeagueBasicInfoDto,
  TeamBasicInfoDto,
} from "./dto/match-basic-response.dto";
import {
  MatchDetailedResponseDto,
  MatchOddsDto,
} from "./dto/match-detailed-response.dto";

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatchData)
    private readonly matchDataRepository: Repository<MatchData>,
  ) {}

  async getUpcomingMatches(
    leagueId?: string,
    isTipster: boolean = false,
  ): Promise<Array<MatchBasicResponseDto | MatchDetailedResponseDto>> {
    const now = new Date();

    let matches: MatchData[];

    if (leagueId) {
      matches = await this.matchDataRepository
        .createQueryBuilder("match")
        .innerJoinAndSelect("match.league", "league")
        .innerJoinAndSelect("match.homeTeam", "homeTeam")
        .innerJoinAndSelect("match.awayTeam", "awayTeam")
        .where("match.league.id = :leagueId", { leagueId })
        .andWhere("match.matchDatetime >= :now", { now })
        .andWhere("match.status = :status", {
          status: MatchStatusType.scheduled,
        })
        .orderBy("match.matchDatetime", "ASC")
        .getMany();
    } else {
      matches = await this.matchDataRepository
        .createQueryBuilder("match")
        .innerJoinAndSelect("match.league", "league")
        .innerJoinAndSelect("match.homeTeam", "homeTeam")
        .innerJoinAndSelect("match.awayTeam", "awayTeam")
        .where("match.matchDatetime >= :now", { now })
        .andWhere("match.status = :status", {
          status: MatchStatusType.scheduled,
        })
        .orderBy("match.matchDatetime", "ASC")
        .getMany();
    }

    if (isTipster) {
      return matches.map((match) => this.mapToDetailedResponse(match));
    } else {
      return matches.map((match) => this.mapToBasicResponse(match));
    }
  }

  async getUpcomingMatchesByLeagueExternalId(
    leagueExternalId: string,
    isTipster: boolean = false,
  ): Promise<Array<MatchBasicResponseDto | MatchDetailedResponseDto>> {
    const now = new Date();

    const matches = await this.matchDataRepository
      .createQueryBuilder("match")
      .innerJoinAndSelect("match.league", "league")
      .innerJoinAndSelect("match.homeTeam", "homeTeam")
      .innerJoinAndSelect("match.awayTeam", "awayTeam")
      .where("league.externalId = :leagueExternalId", { leagueExternalId })
      .andWhere("match.matchDatetime >= :now", { now })
      .andWhere("match.status = :status", { status: MatchStatusType.scheduled })
      .orderBy("match.matchDatetime", "ASC")
      .getMany();

    if (isTipster) {
      return matches.map((match) => this.mapToDetailedResponse(match));
    } else {
      return matches.map((match) => this.mapToBasicResponse(match));
    }
  }

  private mapToBasicResponse(match: MatchData): MatchBasicResponseDto {
    const response = new MatchBasicResponseDto();
    response.id = match.id;
    response.externalId = match.externalId;
    response.matchDate = match.matchDatetime;
    response.status = match.status;
    response.venue = match.venue || null;
    response.round = match.round || null;
    response.season = match.season || null;

    // League info
    if (match.league) {
      const leagueInfo = new LeagueBasicInfoDto();
      leagueInfo.id = match.league.id;
      leagueInfo.externalId = match.league.externalId;
      leagueInfo.name = match.league.name;
      leagueInfo.logoUrl = match.league.logoUrl || null;
      leagueInfo.country = match.league.country || null;
      response.league = leagueInfo;
    }

    // Home team info
    if (match.homeTeam) {
      const homeTeamInfo = new TeamBasicInfoDto();
      homeTeamInfo.id = match.homeTeam.id;
      homeTeamInfo.name = match.homeTeam.name;
      homeTeamInfo.shortName = match.homeTeam.shortName || null;
      homeTeamInfo.logoUrl = match.homeTeam.logoUrl || null;
      response.homeTeam = homeTeamInfo;
    }

    // Away team info
    if (match.awayTeam) {
      const awayTeamInfo = new TeamBasicInfoDto();
      awayTeamInfo.id = match.awayTeam.id;
      awayTeamInfo.name = match.awayTeam.name;
      awayTeamInfo.shortName = match.awayTeam.shortName || null;
      awayTeamInfo.logoUrl = match.awayTeam.logoUrl || null;
      response.awayTeam = awayTeamInfo;
    }

    return response;
  }

  private mapToDetailedResponse(match: MatchData): MatchDetailedResponseDto {
    const response = new MatchDetailedResponseDto();
    response.id = match.id;
    response.externalId = match.externalId;
    response.matchDate = match.matchDatetime;
    response.status = match.status;
    response.venue = match.venue || null;
    response.round = match.round || null;
    response.season = match.season || null;

    // League info
    if (match.league) {
      const leagueInfo = new LeagueBasicInfoDto();
      leagueInfo.id = match.league.id;
      leagueInfo.externalId = match.league.externalId;
      leagueInfo.name = match.league.name;
      leagueInfo.logoUrl = match.league.logoUrl || null;
      leagueInfo.country = match.league.country || null;
      response.league = leagueInfo;
    }

    // Home team info
    if (match.homeTeam) {
      const homeTeamInfo = new TeamBasicInfoDto();
      homeTeamInfo.id = match.homeTeam.id;
      homeTeamInfo.name = match.homeTeam.name;
      homeTeamInfo.shortName = match.homeTeam.shortName || null;
      homeTeamInfo.logoUrl = match.homeTeam.logoUrl || null;
      response.homeTeam = homeTeamInfo;
    }

    // Away team info
    if (match.awayTeam) {
      const awayTeamInfo = new TeamBasicInfoDto();
      awayTeamInfo.id = match.awayTeam.id;
      awayTeamInfo.name = match.awayTeam.name;
      awayTeamInfo.shortName = match.awayTeam.shortName || null;
      awayTeamInfo.logoUrl = match.awayTeam.logoUrl || null;
      response.awayTeam = awayTeamInfo;
    }

    // Fetch and map odds from The Odds API
    // For now, set odds to null (can be implemented later if The Odds API integration is needed)
    // The Java implementation fetches odds but we'll leave it null for now to match the exact Java structure
    response.odds = null;

    return response;
  }
}
