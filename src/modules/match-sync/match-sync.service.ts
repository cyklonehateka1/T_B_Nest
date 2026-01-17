import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, QueryRunner } from "typeorm";
import { MatchData } from "../../common/entities/match-data.entity";
import { Team } from "../../common/entities/team.entity";
import { League } from "../../common/entities/league.entity";
import { Provider } from "../../common/entities/provider.entity";
import { MatchStatusType } from "../../common/enums/match-status-type.enum";
import { TheOddsApiClientService } from "./services/the-odds-api-client.service";

/**
 * Service implementation for syncing matches from The Odds API to the database
 * Works with top 5 European leagues only
 * Handles cases where markets may not exist for some leagues gracefully
 */
@Injectable()
export class MatchSyncService {
  private readonly logger = new Logger(MatchSyncService.name);

  // Top 5 European leagues
  private static readonly TOP_5_EUROPEAN_LEAGUES = [
    "soccer_epl", // Premier League - England
    "soccer_spain_la_liga", // La Liga - Spain
    "soccer_italy_serie_a", // Serie A - Italy
    "soccer_germany_bundesliga", // Bundesliga - Germany
    "soccer_france_ligue_one", // Ligue 1 - France
  ];

  // Default regions and markets for The Odds API
  private static readonly DEFAULT_REGIONS = "us,uk,eu";
  // Request only the markets we need: h2h (match_result), totals (over_under), btts, double_chance, spreads (handicap)
  private static readonly ALL_MARKETS = "h2h,totals,btts,double_chance,spreads";

  constructor(
    @InjectRepository(MatchData)
    private readonly matchDataRepository: Repository<MatchData>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly oddsApiClient: TheOddsApiClientService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sync matches for all active leagues for the next N days
   *
   * @param days Number of days ahead to sync
   * @returns Total number of matches synced across all leagues
   */
  async syncMatchesForAllActiveLeagues(days: number): Promise<number> {
    this.logger.log(
      `Starting match sync for top 5 European leagues (next ${days} days)`,
    );

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    let totalSyncedCount = 0;
    let totalErrorCount = 0;

    for (const leagueExternalId of MatchSyncService.TOP_5_EUROPEAN_LEAGUES) {
      try {
        const syncedCount = await this.syncMatchesForLeague(
          leagueExternalId,
          startDate,
          endDate,
        );
        totalSyncedCount += syncedCount;
        this.logger.log(
          `Successfully synced ${syncedCount} matches for league: ${leagueExternalId}`,
        );
      } catch (error: any) {
        totalErrorCount++;
        this.logger.error(
          `Error syncing matches for league ${leagueExternalId}: ${error.message}`,
          error.stack,
        );
        // Continue with other leagues even if one fails
      }
    }

    if (totalErrorCount > 0) {
      this.logger.warn(
        `Failed to sync ${totalErrorCount} leagues out of ${MatchSyncService.TOP_5_EUROPEAN_LEAGUES.length} total`,
      );
    }

    this.logger.log(
      `Successfully synced ${totalSyncedCount} matches across ${MatchSyncService.TOP_5_EUROPEAN_LEAGUES.length - totalErrorCount} leagues`,
    );
    return totalSyncedCount;
  }

  /**
   * Sync matches for a specific league for the next N days
   *
   * @param leagueExternalId The external ID of the league
   * @param days Number of days ahead to sync
   * @returns Number of matches synced
   */
  async syncMatchesForLeagueDays(
    leagueExternalId: string,
    days: number,
  ): Promise<number> {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    return this.syncMatchesForLeague(leagueExternalId, startDate, endDate);
  }

  /**
   * Sync matches for a specific league within a date range
   *
   * @param leagueExternalId The external ID of the league (e.g., "soccer_epl")
   * @param startDate Start date for the date range (inclusive)
   * @param endDate End date for the date range (inclusive)
   * @returns Number of matches synced
   */
  async syncMatchesForLeague(
    leagueExternalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.syncMatchesForLeagueByDateRangeImpl(
      leagueExternalId,
      startDate,
      endDate,
    );
  }

  private async syncMatchesForLeagueByDateRangeImpl(
    leagueExternalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    this.logger.log(
      `Starting match sync for league: ${leagueExternalId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    try {
      // Find league in database
      const theOddsApiProvider = await this.providerRepository.findOne({
        where: { code: "THE_ODDS_API" },
      });

      if (!theOddsApiProvider) {
        throw new Error("THE_ODDS_API provider not found in database");
      }

      const league = await this.leagueRepository.findOne({
        where: {
          provider: { id: theOddsApiProvider.id },
          externalId: leagueExternalId,
        },
        relations: ["provider"],
      });

      if (!league) {
        throw new Error(`League not found: ${leagueExternalId}`);
      }

      // Format dates for API (The Odds API requires YYYY-MM-DDTHH:MM:SSZ format, no fractional seconds)
      const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, "Z");
      const endDateStr = endDate.toISOString().replace(/\.\d{3}Z$/, "Z");

      // Fetch matches from API with required markets
      this.logger.debug(
        `Fetching matches for league: ${leagueExternalId} using markets: ${MatchSyncService.ALL_MARKETS}`,
      );

      let matchesJson: string;
      try {
        matchesJson = await this.oddsApiClient.fetchOdds(
          leagueExternalId,
          MatchSyncService.DEFAULT_REGIONS,
          MatchSyncService.ALL_MARKETS,
          startDateStr,
          endDateStr,
          "decimal",
        );
      } catch (error: any) {
        this.logger.error(
          `Error fetching matches from API for league ${leagueExternalId}: ${error.message}`,
          error.stack,
        );
        throw new Error(
          `Failed to fetch matches from API for league: ${leagueExternalId}`,
        );
      }

      // Handle empty or null response gracefully
      if (!matchesJson || matchesJson.trim() === "") {
        this.logger.warn(
          `Empty response from API for league: ${leagueExternalId}`,
        );
        return 0;
      }

      // Parse matches from JSON
      const matches = this.parseMatchesJson(matchesJson);
      this.logger.log(
        `Parsed ${matches.length} matches from API for league: ${leagueExternalId}`,
      );

      // Process and save matches (each in its own transaction to prevent one failure from aborting all)
      let syncedCount = 0;
      let errorCount = 0;

      for (const matchData of matches) {
        try {
          const match = await this.processAndSaveMatchInNewTransaction(
            matchData,
            league,
          );
          if (match) {
            syncedCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          const matchId = matchData.id || "unknown";
          this.logger.error(
            `Error processing match ${matchId} for league ${leagueExternalId}: ${error.message}`,
          );
          // Continue processing other matches - each match has its own transaction
        }
      }

      if (errorCount > 0) {
        this.logger.warn(
          `Failed to process ${errorCount} matches for league: ${leagueExternalId}`,
        );
      }

      this.logger.log(
        `Successfully synced ${syncedCount} matches for league: ${leagueExternalId}`,
      );
      return syncedCount;
    } catch (error: any) {
      this.logger.error(
        `Error syncing matches for league ${leagueExternalId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to sync matches for league: ${leagueExternalId}`);
    }
  }

  /**
   * Parse JSON string to list of match nodes
   * Handles errors gracefully and returns empty list on failure
   */
  private parseMatchesJson(json: string): any[] {
    try {
      if (!json || json.trim() === "") {
        this.logger.warn("Empty JSON response from API");
        return [];
      }

      const root = JSON.parse(json);
      if (Array.isArray(root)) {
        this.logger.debug(`Parsed ${root.length} matches from JSON response`);
        return root;
      } else {
        // API returned an object (likely an error response)
        if (root.message) {
          this.logger.warn(
            `API returned error object. Message: ${root.message}`,
          );
        } else if (root.error) {
          this.logger.warn(`API returned error object. Error: ${root.error}`);
        } else {
          const responseContent =
            json.length > 500 ? json.substring(0, 500) : json;
          this.logger.warn(
            `API returned object instead of array. Response content: ${responseContent}`,
          );
        }
        return [];
      }
    } catch (error: any) {
      const preview = json && json.length > 500 ? json.substring(0, 500) : json;
      this.logger.error(
        `Error parsing matches JSON: ${error.message}. First 500 chars: ${preview}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Process a match from The Odds API and save it to the database
   * Each match is processed in its own transaction to prevent one failure from aborting all
   */
  private async processAndSaveMatchInNewTransaction(
    matchData: any,
    league: League,
  ): Promise<MatchData | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.processAndSaveMatch(
        matchData,
        league,
        queryRunner,
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process a match from The Odds API and save it to the database
   * This method handles all validation and error cases gracefully
   */
  private async processAndSaveMatch(
    matchData: any,
    league: League,
    queryRunner: QueryRunner,
  ): Promise<MatchData | null> {
    try {
      // Extract external ID (required)
      const externalId = matchData.id?.toString();
      if (!externalId || externalId.trim() === "") {
        this.logger.warn("Match missing external ID, skipping");
        return null;
      }

      // Check if match already exists
      let existingMatch = await queryRunner.manager.findOne(MatchData, {
        where: { externalId },
      });

      const match = existingMatch || queryRunner.manager.create(MatchData, {});
      match.externalId = externalId;
      match.league = league;

      // Parse and set match datetime (required)
      const commenceTimeStr = matchData.commence_time;
      if (!commenceTimeStr || commenceTimeStr.trim() === "") {
        this.logger.warn(`Match ${externalId} missing commence_time, skipping`);
        return null;
      }

      try {
        const matchDatetime = new Date(commenceTimeStr);
        if (isNaN(matchDatetime.getTime())) {
          throw new Error("Invalid date");
        }
        match.matchDatetime = matchDatetime;
      } catch (error: any) {
        this.logger.warn(
          `Match ${externalId} has invalid commence_time format: ${commenceTimeStr}, skipping`,
        );
        return null;
      }

      // Extract team names (required)
      const homeTeamName = matchData.home_team;
      const awayTeamName = matchData.away_team;

      if (
        !homeTeamName ||
        homeTeamName.trim() === "" ||
        !awayTeamName ||
        awayTeamName.trim() === ""
      ) {
        this.logger.warn(
          `Match ${externalId} missing team names (home: ${homeTeamName}, away: ${awayTeamName}), skipping`,
        );
        return null;
      }

      // Get or create teams with retry logic
      // Get country from league before setting it on match to avoid lazy loading issues
      const country = league?.country || null;
      let homeTeam: Team;
      let awayTeam: Team;

      try {
        homeTeam = await this.getOrCreateTeamWithRetry(
          homeTeamName,
          country,
          queryRunner,
        );
        awayTeam = await this.getOrCreateTeamWithRetry(
          awayTeamName,
          country,
          queryRunner,
        );
      } catch (error: any) {
        this.logger.error(
          `Error getting/creating teams for match ${externalId}: ${error.message}`,
          error.stack,
        );
        throw new Error(`Failed to get/create teams for match: ${externalId}`);
      }

      match.homeTeam = homeTeam;
      match.awayTeam = awayTeam;

      // Set status (default to scheduled)
      match.status = MatchStatusType.scheduled;

      // Parse and set odds from bookmakers (prefer betway, fallback to others)
      // Always update odds even if match exists
      const oddsObject = this.extractOddsFromMatchData(
        matchData,
        homeTeamName,
        awayTeamName,
      );
      if (oddsObject && Object.keys(oddsObject).length > 0) {
        match.odds = oddsObject;
        this.logger.debug(
          `Extracted odds for match ${externalId}: ${JSON.stringify(oddsObject)}`,
        );
      } else {
        this.logger.debug(`No odds found for match ${externalId}`);
      }

      // Update last synced timestamp
      match.lastSyncedAt = new Date();

      // Save match to database
      try {
        const savedMatch = await queryRunner.manager.save(MatchData, match);
        this.logger.debug(
          `Saved match: ${savedMatch.id} (${externalId}) - ${homeTeamName} vs ${awayTeamName}`,
        );
        return savedMatch;
      } catch (error: any) {
        // Handle unique constraint violations (external_id already exists)
        if (
          error.code === "23505" ||
          error.message.includes("unique constraint") ||
          error.message.includes("duplicate key")
        ) {
          this.logger.warn(
            `Match ${externalId} already exists in database (unique constraint violation), fetching existing match`,
          );
          const existingMatch = await queryRunner.manager.findOne(MatchData, {
            where: { externalId },
          });
          if (existingMatch) {
            return existingMatch;
          }
        }
        throw new Error(
          `Failed to save match due to constraint violation: ${externalId}`,
        );
      }
    } catch (error: any) {
      if (error.message.includes("Failed to")) {
        throw error;
      }
      this.logger.error(
        `Unexpected error processing match: ${error.message}`,
        error.stack,
      );
      throw new Error("Unexpected error processing match");
    }
  }

  /**
   * Get or create a team by name with retry logic
   * Handles race conditions by retrying fetch if creation fails due to duplicate key
   */
  private async getOrCreateTeamWithRetry(
    teamName: string,
    country: string | null,
    queryRunner: QueryRunner,
  ): Promise<Team> {
    try {
      return await this.getOrCreateTeam(teamName, country, queryRunner);
    } catch (error: any) {
      // Handle duplicate key or unique constraint violation
      // This can happen in race conditions - another thread/process created the team
      if (
        error.code === "23505" ||
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        this.logger.debug(
          `Team ${teamName} already exists (race condition), fetching from DB`,
        );
        const externalId = this.generateTeamExternalId(teamName);
        const existingTeam = await this.fetchExistingTeam(
          teamName,
          externalId,
          queryRunner,
        );
        if (existingTeam) {
          return existingTeam;
        }
      }
      this.logger.error(
        `Failed to create team ${teamName} and could not find existing team after duplicate key violation`,
      );
      throw new Error(`Failed to create team: ${teamName}`);
    }
  }

  /**
   * Get or create a team by name
   * Uses REQUIRES_NEW propagation to isolate transaction failures
   */
  private async getOrCreateTeam(
    teamName: string,
    country: string | null,
    queryRunner: QueryRunner,
  ): Promise<Team> {
    // Try to find by name first
    let team = await queryRunner.manager.findOne(Team, {
      where: { name: teamName },
    });

    if (team) {
      return team;
    }

    // Generate external ID
    const externalId = this.generateTeamExternalId(teamName);

    // Try to find by external ID (in case name changed but external ID exists)
    team = await queryRunner.manager.findOne(Team, {
      where: { externalId },
    });

    if (team) {
      // Update name if it changed (but don't save if name is the same to avoid unnecessary DB call)
      if (teamName !== team.name) {
        team.name = teamName;
        team = await queryRunner.manager.save(Team, team);
      }
      return team;
    }

    // Create new team
    const newTeam = queryRunner.manager.create(Team, {
      name: teamName,
      country: country || undefined,
      externalId: externalId,
    });

    team = await queryRunner.manager.save(Team, newTeam);
    this.logger.debug(`Created new team: ${team.name} (${team.id})`);
    return team;
  }

  /**
   * Generate external ID for a team
   */
  private generateTeamExternalId(teamName: string): string {
    return "team_" + teamName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  /**
   * Fetch an existing team by name or external ID
   * Runs in a new transaction to recover from aborted transactions
   */
  private async fetchExistingTeam(
    teamName: string,
    externalId: string,
    queryRunner: QueryRunner,
  ): Promise<Team | null> {
    let team = await queryRunner.manager.findOne(Team, {
      where: { name: teamName },
    });

    if (team) {
      return team;
    }

    team = await queryRunner.manager.findOne(Team, {
      where: { externalId },
    });

    return team || null;
  }

  /**
   * Extract all available odds from match data, preferring betway, falling back to other bookmakers
   * Returns stringified JSON matching frontend BettingMarkets format
   * Extracts: match_result, over_under, btts, double_chance, handicap
   */
  private extractOddsFromMatchData(
    matchData: any,
    homeTeamName: string,
    awayTeamName: string,
  ): Record<string, any> | null {
    try {
      const bookmakers = matchData.bookmakers;
      if (!Array.isArray(bookmakers) || bookmakers.length === 0) {
        this.logger.debug("No bookmakers found in match data");
        return null;
      }

      // First, try to find betway
      let betwayBookmaker: any = null;
      let fallbackBookmaker: any = null;

      for (const bookmaker of bookmakers) {
        const bookmakerKey = bookmaker.key;
        if (bookmakerKey === "betway") {
          betwayBookmaker = bookmaker;
          break;
        }
        // Store first available bookmaker as fallback
        if (!fallbackBookmaker) {
          fallbackBookmaker = bookmaker;
        }
      }

      // Use betway if available, otherwise use fallback
      const selectedBookmaker = betwayBookmaker || fallbackBookmaker;
      if (!selectedBookmaker) {
        this.logger.debug("No bookmakers available with valid markets");
        return null;
      }

      const bookmakerName = selectedBookmaker.key;
      this.logger.debug(`Using bookmaker: ${bookmakerName}`);

      // Extract all markets
      const markets = selectedBookmaker.markets;
      if (!Array.isArray(markets) || markets.length === 0) {
        this.logger.debug(`No markets found in bookmaker ${bookmakerName}`);
        return null;
      }

      // Build markets map for easy lookup
      const marketsMap: Record<string, any> = {};
      for (const market of markets) {
        const marketKey = market.key;
        marketsMap[marketKey] = market;
      }

      // Build JSON structure matching frontend BettingMarkets format
      const oddsMap: Record<string, any> = {};
      let hasAnyOdds = false;

      // 1. MATCH RESULT (h2h)
      const matchResult = this.extractMatchResult(
        marketsMap,
        homeTeamName,
        awayTeamName,
      );
      if (matchResult && Object.keys(matchResult).length > 0) {
        oddsMap.match_result = matchResult;
        hasAnyOdds = true;
      }

      // 2. OVER/UNDER (totals)
      const overUnder = this.extractOverUnder(marketsMap);
      if (overUnder && Object.keys(overUnder).length > 0) {
        oddsMap.over_under = overUnder;
        hasAnyOdds = true;
      }

      // 3. BOTH TEAMS TO SCORE (btts)
      const btts = this.extractBtts(marketsMap);
      if (btts && Object.keys(btts).length > 0) {
        oddsMap.btts = btts;
        hasAnyOdds = true;
      }

      // 4. DOUBLE CHANCE (double_chance)
      const doubleChance = this.extractDoubleChance(marketsMap);
      if (doubleChance && Object.keys(doubleChance).length > 0) {
        oddsMap.double_chance = doubleChance;
        hasAnyOdds = true;
      }

      // 5. HANDICAP (spreads or alternate_spreads)
      const handicap = this.extractHandicap(
        marketsMap,
        homeTeamName,
        awayTeamName,
      );
      if (handicap && Object.keys(handicap).length > 0) {
        oddsMap.handicap = handicap;
        hasAnyOdds = true;
      }

      // If no odds were extracted, return null
      if (!hasAnyOdds) {
        this.logger.debug(
          `No valid odds extracted from bookmaker ${bookmakerName}`,
        );
        return null;
      }

      oddsMap.bookmaker = bookmakerName;

      // Return as object (will be stored as JSONB in database)
      return oddsMap;
    } catch (error: any) {
      this.logger.warn(
        `Error extracting odds from match data: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Extract match result odds (home_win, draw, away_win) from h2h market
   */
  private extractMatchResult(
    marketsMap: Record<string, any>,
    homeTeamName: string,
    awayTeamName: string,
  ): Record<string, number> | null {
    const h2hMarket = marketsMap["h2h"];
    if (!h2hMarket) {
      return null;
    }

    const outcomes = h2hMarket.outcomes;
    if (!Array.isArray(outcomes) || outcomes.length < 3) {
      return null;
    }

    let homeWin: number | null = null;
    let draw: number | null = null;
    let awayWin: number | null = null;

    for (const outcome of outcomes) {
      const outcomeName = outcome.name;
      const price = outcome.price;

      if (!price || price <= 0) {
        continue;
      }

      if (
        outcomeName === homeTeamName ||
        outcomeName.toLowerCase() === homeTeamName.toLowerCase()
      ) {
        homeWin = price;
      } else if (
        outcomeName === awayTeamName ||
        outcomeName.toLowerCase() === awayTeamName.toLowerCase()
      ) {
        awayWin = price;
      } else if (outcomeName.toLowerCase() === "draw") {
        draw = price;
      }
    }

    if (homeWin === null || draw === null || awayWin === null) {
      return null;
    }

    return {
      home_win: homeWin,
      draw: draw,
      away_win: awayWin,
    };
  }

  /**
   * Extract over/under odds from totals market
   * Maps to: over_0_5, under_0_5, over_1_5, under_1_5, over_2_5, under_2_5, over_3_5, under_3_5, over_4_5, under_4_5
   */
  private extractOverUnder(
    marketsMap: Record<string, any>,
  ): Record<string, number> | null {
    let totalsMarket = marketsMap["totals"];
    if (!totalsMarket) {
      // Try alternate_totals as fallback
      totalsMarket = marketsMap["alternate_totals"];
    }

    if (!totalsMarket) {
      return null;
    }

    const outcomes = totalsMarket.outcomes;
    if (!Array.isArray(outcomes)) {
      return null;
    }

    const overUnder: Record<string, number> = {};

    for (const outcome of outcomes) {
      const outcomeName = outcome.name;
      const price = outcome.price;

      if (!price || price <= 0) {
        continue;
      }

      // Get the point value from outcome (e.g., "Over 2.5", "Under 1.5")
      const point = outcome.point;
      if (point === null || point === undefined || typeof point !== "number") {
        continue;
      }

      const pointValue = point;
      const key = this.formatOverUnderKey(outcomeName, pointValue);

      if (
        key &&
        (key === "over_0_5" ||
          key === "under_0_5" ||
          key === "over_1_5" ||
          key === "under_1_5" ||
          key === "over_2_5" ||
          key === "under_2_5" ||
          key === "over_3_5" ||
          key === "under_3_5" ||
          key === "over_4_5" ||
          key === "under_4_5")
      ) {
        overUnder[key] = price;
      }
    }

    return Object.keys(overUnder).length > 0 ? overUnder : null;
  }

  private formatOverUnderKey(
    outcomeName: string,
    pointValue: number,
  ): string | null {
    const formatted = pointValue.toFixed(1).replace(".", "_");
    if (outcomeName.toLowerCase().startsWith("over")) {
      return `over_${formatted}`;
    } else if (outcomeName.toLowerCase().startsWith("under")) {
      return `under_${formatted}`;
    }
    return null;
  }

  /**
   * Extract both teams to score odds (btts) from btts market
   */
  private extractBtts(
    marketsMap: Record<string, any>,
  ): Record<string, number> | null {
    const bttsMarket = marketsMap["btts"];
    if (!bttsMarket) {
      return null;
    }

    const outcomes = bttsMarket.outcomes;
    if (!Array.isArray(outcomes)) {
      return null;
    }

    let yes: number | null = null;
    let no: number | null = null;

    for (const outcome of outcomes) {
      const outcomeName = outcome.name;
      const price = outcome.price;

      if (!price || price <= 0) {
        continue;
      }

      const normalizedName = outcomeName.toLowerCase();
      if (
        normalizedName === "yes" ||
        normalizedName.includes("both teams to score")
      ) {
        yes = price;
      } else if (
        normalizedName === "no" ||
        normalizedName.includes("not both teams to score")
      ) {
        no = price;
      }
    }

    if (yes === null || no === null) {
      return null;
    }

    return {
      yes: yes,
      no: no,
    };
  }

  /**
   * Extract double chance odds from double_chance market
   * Maps to: home_draw, home_away, away_draw
   */
  private extractDoubleChance(
    marketsMap: Record<string, any>,
  ): Record<string, number> | null {
    const doubleChanceMarket = marketsMap["double_chance"];
    if (!doubleChanceMarket) {
      return null;
    }

    const outcomes = doubleChanceMarket.outcomes;
    if (!Array.isArray(outcomes)) {
      return null;
    }

    let homeDraw: number | null = null;
    let homeAway: number | null = null;
    let awayDraw: number | null = null;

    for (const outcome of outcomes) {
      const outcomeName = outcome.name;
      const price = outcome.price;

      if (!price || price <= 0) {
        continue;
      }

      // Map API outcomes to frontend format
      // API might use: "1X", "12", "X2" or "Home or Draw", "Home or Away", "Away or Draw"
      const normalized = outcomeName.toUpperCase().replace(/\s/g, "");

      if (normalized === "1X" || normalized.includes("HOMEORDRAW")) {
        homeDraw = price;
      } else if (normalized === "12" || normalized.includes("HOMEORAWAY")) {
        homeAway = price;
      } else if (normalized === "X2" || normalized.includes("AWAYORDRAW")) {
        awayDraw = price;
      }
    }

    const doubleChance: Record<string, number> = {};
    if (homeDraw !== null) doubleChance.home_draw = homeDraw;
    if (homeAway !== null) doubleChance.home_away = homeAway;
    if (awayDraw !== null) doubleChance.away_draw = awayDraw;

    return Object.keys(doubleChance).length > 0 ? doubleChance : null;
  }

  /**
   * Extract handicap odds from spreads or alternate_spreads market
   */
  private extractHandicap(
    marketsMap: Record<string, any>,
    homeTeamName: string,
    awayTeamName: string,
  ): Record<string, number> | null {
    let spreadsMarket = marketsMap["spreads"];
    if (!spreadsMarket) {
      // Try alternate_spreads as fallback
      spreadsMarket = marketsMap["alternate_spreads"];
    }

    if (!spreadsMarket) {
      return null;
    }

    const outcomes = spreadsMarket.outcomes;
    if (!Array.isArray(outcomes)) {
      return null;
    }

    const handicap: Record<string, number> = {};

    for (const outcome of outcomes) {
      const outcomeName = outcome.name;
      const price = outcome.price;
      const point = outcome.point;

      if (
        !price ||
        price <= 0 ||
        point === null ||
        point === undefined ||
        typeof point !== "number"
      ) {
        continue;
      }

      // Create key from handicap line (e.g., "home_+1.5", "away_-0.5")
      const pointValue = point;
      const key = this.formatHandicapKey(
        outcomeName,
        pointValue,
        homeTeamName,
        awayTeamName,
      );

      if (key) {
        handicap[key] = price;
      }
    }

    return Object.keys(handicap).length > 0 ? handicap : null;
  }

  private formatHandicapKey(
    outcomeName: string,
    pointValue: number,
    homeTeamName: string,
    awayTeamName: string,
  ): string | null {
    const normalizedName = outcomeName.toUpperCase();
    const normalizedHomeTeam = homeTeamName ? homeTeamName.toUpperCase() : "";
    const normalizedAwayTeam = awayTeamName ? awayTeamName.toUpperCase() : "";

    const sign = pointValue >= 0 ? "+" : "";
    const formattedValue = Math.abs(pointValue).toFixed(1);

    if (
      normalizedName.includes("HOME") ||
      normalizedName === normalizedHomeTeam ||
      normalizedName.startsWith("1")
    ) {
      return `home_${sign}${formattedValue}`;
    } else if (
      normalizedName.includes("AWAY") ||
      normalizedName === normalizedAwayTeam ||
      normalizedName.startsWith("2")
    ) {
      return `away_${sign}${formattedValue}`;
    } else {
      // Fallback: use point value sign (positive = home favored, negative = away favored)
      return (pointValue >= 0 ? "home_" : "away_") + sign + formattedValue;
    }
  }
}
