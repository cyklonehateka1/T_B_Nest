import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

/**
 * Client for interacting with The Odds API
 * Handles all API calls to https://api.the-odds-api.com
 */
@Injectable()
export class TheOddsApiClientService {
  private readonly logger = new Logger(TheOddsApiClientService.name);
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.the-odds-api.com/v4";
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("THE_ODDS_API_KEY") || "";
    
    if (!this.apiKey) {
      this.logger.warn("THE_ODDS_API_KEY is not set. Match sync will fail.");
    }

    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        "Accept": "application/json",
      },
    });
  }

  /**
   * Fetches all available sports from The Odds API
   * @returns List of sports/leagues from the API
   */
  async fetchSports(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/sports?apiKey=${encodeURIComponent(this.apiKey)}&all=true`;
      
      this.logger.debug(`Fetching sports from The Odds API: ${url}`);
      
      const response = await this.httpClient.get<any[]>(url);
      const sports = response.data;
      
      this.logger.log(`Successfully fetched ${sports.length} sports from The Odds API`);
      return sports;
    } catch (error: any) {
      this.logger.error("Error fetching sports from The Odds API", error);
      throw new Error(`Failed to fetch sports from The Odds API: ${error.message}`);
    }
  }

  /**
   * Fetches leagues for a specific sport from The Odds API
   * Note: The Odds API returns sports which are essentially leagues
   * This method filters by sport group (e.g., "Soccer")
   * 
   * @param sportGroup The sport group to filter by (e.g., "Soccer", "Basketball")
   * @returns List of leagues for the specified sport group
   */
  async fetchLeaguesBySportGroup(sportGroup: string): Promise<any[]> {
    const allSports = await this.fetchSports();
    return allSports.filter((sport) => 
      sport.group && sport.group.toLowerCase() === sportGroup.toLowerCase()
    );
  }

  /**
   * Fetches upcoming matches with odds from The Odds API
   * 
   * @param sportKey The sport key (e.g., "soccer_epl", "soccer_spain_la_liga")
   * @param regions Comma-separated regions (e.g., "us", "uk", "eu")
   * @param markets Comma-separated markets (e.g., "h2h,spreads,totals")
   * @returns JSON string response from The Odds API
   */
  async fetchMatchesWithOdds(
    sportKey: string,
    regions: string,
    markets: string
  ): Promise<string> {
    return this.fetchOdds(sportKey, regions, markets, null, null, "decimal");
  }

  /**
   * Fetches matches with odds from The Odds API with date filtering
   * 
   * @param sportKey The sport key (e.g., "soccer_epl", "soccer_spain_la_liga")
   * @param regions Comma-separated regions (e.g., "us", "uk", "eu")
   * @param markets Comma-separated markets (e.g., "h2h,spreads,totals")
   * @param commenceTimeFrom Start date in ISO 8601 format (e.g., "2024-01-12T00:00:00Z")
   * @param commenceTimeTo End date in ISO 8601 format (e.g., "2024-01-14T23:59:59Z")
   * @param oddsFormat Odds format: "decimal" or "american" (default: "decimal")
   * @returns JSON string response from The Odds API
   */
  async fetchOdds(
    sportKey: string,
    regions: string,
    markets: string,
    commenceTimeFrom: string | null,
    commenceTimeTo: string | null,
    oddsFormat: string = "decimal"
  ): Promise<string> {
    try {
      let url = `${this.baseUrl}/sports/${encodeURIComponent(sportKey)}/odds`;
      url += `?apiKey=${encodeURIComponent(this.apiKey)}`;
      url += `&regions=${encodeURIComponent(regions)}`;
      url += `&markets=${encodeURIComponent(markets)}`;
      url += `&oddsFormat=${encodeURIComponent(oddsFormat)}`;

      // Add date filters if provided
      if (commenceTimeFrom && commenceTimeFrom.trim() !== "") {
        url += `&commenceTimeFrom=${encodeURIComponent(commenceTimeFrom)}`;
      }
      if (commenceTimeTo && commenceTimeTo.trim() !== "") {
        url += `&commenceTimeTo=${encodeURIComponent(commenceTimeTo)}`;
      }

      this.logger.debug(`Fetching matches with odds from The Odds API: ${url}`);

      const response = await this.httpClient.get(url);
      const responseBody = typeof response.data === "string" 
        ? response.data 
        : JSON.stringify(response.data);

      // Log response size for debugging
      if (responseBody) {
        this.logger.debug(
          `API response size: ${responseBody.length} characters for sport: ${sportKey} (markets: ${markets})`
        );

        // Check if response is empty array
        const trimmed = responseBody.trim();
        if (trimmed === "[]") {
          this.logger.debug(`API returned empty array for sport: ${sportKey} (markets: ${markets})`);
        }

        // Check if response is an error object
        try {
          const root = JSON.parse(responseBody);
          if (!Array.isArray(root) && root.message) {
            this.logger.warn(
              `API returned error for sport: ${sportKey} (markets: ${markets}). Message: ${root.message}`
            );
          }
        } catch (e) {
          // Not JSON or parsing failed, ignore
        }
      }

      this.logger.log(`Successfully fetched matches with odds for sport: ${sportKey} (markets: ${markets})`);
      return responseBody;
    } catch (error: any) {
      this.logger.error(`Error fetching matches with odds from The Odds API for sport: ${sportKey}`, error);
      throw new Error(`Failed to fetch matches with odds: ${error.message}`);
    }
  }
}
