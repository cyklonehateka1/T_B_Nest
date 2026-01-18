import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
@Injectable()
export class TheOddsApiClientService {
  private readonly logger = new Logger(TheOddsApiClientService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("THE_ODDS_API_KEY") || "";
    if (!this.apiKey) {
      this.logger.warn("THE_ODDS_API_KEY is not set. Match sync will fail.");
    }
    const baseUrl = this.configService.get<string>("THE_ODDS_API_BASE_URL");
    if (!baseUrl) {
      this.logger.warn(
        "THE_ODDS_API_BASE_URL is not set. Using default: https://api.the-odds-api.com/v4",
      );
      this.baseUrl = "https://api.the-odds-api.com/v4";
    } else {
      this.baseUrl = baseUrl;
    }
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        Accept: "application/json",
      },
    });
  }
  async fetchSports(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/sports?apiKey=${encodeURIComponent(this.apiKey)}&all=true`;
      this.logger.debug(`Fetching sports from The Odds API: ${url}`);
      const response = await this.httpClient.get<any[]>(url);
      const sports = response.data;
      this.logger.log(
        `Successfully fetched ${sports.length} sports from The Odds API`,
      );
      return sports;
    } catch (error: any) {
      this.logger.error("Error fetching sports from The Odds API", error);
      throw new Error(
        `Failed to fetch sports from The Odds API: ${error.message}`,
      );
    }
  }
  async fetchLeaguesBySportGroup(sportGroup: string): Promise<any[]> {
    const allSports = await this.fetchSports();
    return allSports.filter(
      (sport) =>
        sport.group && sport.group.toLowerCase() === sportGroup.toLowerCase(),
    );
  }
  async fetchMatchesWithOdds(
    sportKey: string,
    regions: string,
    markets: string,
  ): Promise<string> {
    return this.fetchOdds(sportKey, regions, markets, null, null, "decimal");
  }
  async fetchOdds(
    sportKey: string,
    regions: string,
    markets: string,
    commenceTimeFrom: string | null,
    commenceTimeTo: string | null,
    oddsFormat: string = "decimal",
  ): Promise<string> {
    try {
      let url = `${this.baseUrl}/sports/${encodeURIComponent(sportKey)}/odds`;
      url += `?apiKey=${encodeURIComponent(this.apiKey)}`;
      url += `&regions=${encodeURIComponent(regions)}`;
      url += `&markets=${encodeURIComponent(markets)}`;
      url += `&oddsFormat=${encodeURIComponent(oddsFormat)}`;
      if (commenceTimeFrom && commenceTimeFrom.trim() !== "") {
        url += `&commenceTimeFrom=${encodeURIComponent(commenceTimeFrom)}`;
      }
      if (commenceTimeTo && commenceTimeTo.trim() !== "") {
        url += `&commenceTimeTo=${encodeURIComponent(commenceTimeTo)}`;
      }
      this.logger.debug(`Fetching matches with odds from The Odds API: ${url}`);
      const response = await this.httpClient.get(url);
      const responseBody =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);
      if (responseBody) {
        this.logger.debug(
          `API response size: ${responseBody.length} characters for sport: ${sportKey} (markets: ${markets})`,
        );
        const trimmed = responseBody.trim();
        if (trimmed === "[]") {
          this.logger.debug(
            `API returned empty array for sport: ${sportKey} (markets: ${markets})`,
          );
        }
        try {
          const root = JSON.parse(responseBody);
          if (!Array.isArray(root) && root.message) {
            this.logger.warn(
              `API returned error for sport: ${sportKey} (markets: ${markets}). Message: ${root.message}`,
            );
          }
        } catch (e) {
          // JSON parsing failed, but we'll still return the response body
          this.logger.debug(
            `Failed to parse API response as JSON for sport: ${sportKey}`,
          );
        }
      }
      this.logger.log(
        `Successfully fetched matches with odds for sport: ${sportKey} (markets: ${markets})`,
      );
      return responseBody;
    } catch (error: any) {
      this.logger.error(
        `Error fetching matches with odds from The Odds API for sport: ${sportKey}`,
        error,
      );
      throw new Error(`Failed to fetch matches with odds: ${error.message}`);
    }
  }
}
