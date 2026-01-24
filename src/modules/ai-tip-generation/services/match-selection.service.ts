import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, In, Not } from "typeorm";
import { MatchData } from "../../../common/entities/match-data.entity";
import { League } from "../../../common/entities/league.entity";
import { MatchStatusType } from "../../../common/enums/match-status-type.enum";
import { CompetitionType } from "../../../common/enums/competition-type.enum";

@Injectable()
export class MatchSelectionService {
  private readonly logger = new Logger(MatchSelectionService.name);

  // Top 5 European leagues
  private readonly top5EuropeanLeagues = [
    "soccer_epl",
    "soccer_spain_la_liga",
    "soccer_italy_serie_a",
    "soccer_germany_bundesliga",
    "soccer_france_ligue_one",
  ];

  constructor(
    @InjectRepository(MatchData)
    private readonly matchDataRepository: Repository<MatchData>,
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
  ) {}

  /**
   * Select matches for weekend league tips
   * Top 5 European leagues + 5 other leagues based on importance
   */
  async selectWeekendLeagueMatches(
    startDate: Date,
    endDate: Date,
  ): Promise<MatchData[]> {
    this.logger.debug(
      `Selecting weekend league matches from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get top 5 European leagues (by externalId - The Odds API keys)
    const top5Leagues = await this.leagueRepository.find({
      where: {
        externalId: In(this.top5EuropeanLeagues),
        isActive: true,
      },
    });

    const top5LeagueIds = top5Leagues.map((l) => l.id);
    this.logger.debug(
      `Top 5 leagues: ${top5Leagues.map((l) => l.externalId).join(", ")} (${top5LeagueIds.length} found)`,
    );

    if (top5LeagueIds.length === 0) {
      this.logger.warn(
        "No top 5 European leagues found. Ensure leagues with externalId in [soccer_epl, soccer_spain_la_liga, soccer_italy_serie_a, soccer_germany_bundesliga, soccer_france_ligue_one] exist.",
      );
    }

    // Only include future matches (match_datetime >= now)
    const now = new Date();

    // Get matches from top 5 leagues
    const top5Matches = await this.matchDataRepository.find({
      where: {
        league: { id: In(top5LeagueIds) },
        status: MatchStatusType.scheduled,
        matchDatetime: Between(startDate, endDate),
      },
      relations: ["league", "homeTeam", "awayTeam"],
      order: {
        matchDatetime: "ASC",
      },
    });

    // Filter to future matches only (Between includes past matches in range)
    const futureTop5 = top5Matches.filter((m) => new Date(m.matchDatetime) >= now);
    this.logger.debug(
      `Found ${top5Matches.length} matches from top 5 European leagues (${futureTop5.length} future)`,
    );

    // Get all other league matches
    const otherMatches = await this.matchDataRepository.find({
      where: {
        league: { id: Not(In(top5LeagueIds)) },
        status: MatchStatusType.scheduled,
        matchDatetime: Between(startDate, endDate),
      },
      relations: ["league", "homeTeam", "awayTeam"],
      order: {
        matchDatetime: "ASC",
      },
    });

    const futureOther = otherMatches.filter((m) => new Date(m.matchDatetime) >= now);
    this.logger.debug(
      `Found ${otherMatches.length} matches from other leagues (${futureOther.length} future)`,
    );

    // For now, take first 5 other matches (later we'll add importance/predictability scoring)
    const selectedOtherMatches = futureOther.slice(0, 5);

    const allMatches = [...futureTop5, ...selectedOtherMatches];

    this.logger.log(
      `Selected ${allMatches.length} matches for weekend tips (${futureTop5.length} from top 5, ${selectedOtherMatches.length} from others)`,
    );

    return allMatches;
  }

  /**
   * Select matches for Champions League
   */
  async selectChampionsLeagueMatches(
    startDate: Date,
    endDate: Date,
  ): Promise<MatchData[]> {
    const matches = await this.matchDataRepository.find({
      where: {
        league: { competitionType: CompetitionType.CHAMPIONS_LEAGUE },
        status: MatchStatusType.scheduled,
        matchDatetime: Between(startDate, endDate),
      },
      relations: ["league", "homeTeam", "awayTeam"],
      order: {
        matchDatetime: "ASC",
      },
    });

    this.logger.log(`Found ${matches.length} Champions League matches`);
    return matches;
  }

  /**
   * Select matches for Europa League
   */
  async selectEuropaLeagueMatches(
    startDate: Date,
    endDate: Date,
  ): Promise<MatchData[]> {
    const matches = await this.matchDataRepository.find({
      where: {
        league: { competitionType: CompetitionType.EUROPA_LEAGUE },
        status: MatchStatusType.scheduled,
        matchDatetime: Between(startDate, endDate),
      },
      relations: ["league", "homeTeam", "awayTeam"],
      order: {
        matchDatetime: "ASC",
      },
    });

    this.logger.log(`Found ${matches.length} Europa League matches`);
    return matches;
  }

  /**
   * Select matches for international competitions
   */
  async selectInternationalMatches(
    competitionType: CompetitionType,
    startDate: Date,
    endDate: Date,
  ): Promise<MatchData[]> {
    const matches = await this.matchDataRepository.find({
      where: {
        league: { competitionType },
        status: MatchStatusType.scheduled,
        matchDatetime: Between(startDate, endDate),
      },
      relations: ["league", "homeTeam", "awayTeam"],
      order: {
        matchDatetime: "ASC",
      },
    });

    this.logger.log(
      `Found ${matches.length} matches for ${competitionType}`,
    );
    return matches;
  }

  /**
   * Get next Friday
   */
  getNextFriday(date: Date = new Date()): Date {
    const friday = new Date(date);
    const day = friday.getDay();
    const diff = day <= 4 ? 4 - day : 11 - day; // Next Friday
    friday.setDate(friday.getDate() + diff);
    friday.setHours(0, 0, 0, 0);
    return friday;
  }

  /**
   * Get weekend date range (Friday to Sunday)
   */
  getWeekendDateRange(): { start: Date; end: Date } {
    const friday = this.getNextFriday();
    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);

    return { start: friday, end: sunday };
  }
}
