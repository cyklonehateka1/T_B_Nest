import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

export interface CountryDetectionResult {
  countryCode: string;
  localCurrencyCode: string;
  localCurrencyName: string;
}

@Injectable()
export class CountryDetectionService {
  private readonly logger = new Logger(CountryDetectionService.name);

  async detectCountryFromIP(ipAddress: string): Promise<CountryDetectionResult> {
    // Handle localhost and private IPs
    const privateIPs = [
      "127.0.0.1",
      "::1",
      "localhost",
      "10.0.0.0",
      "10.255.255.255",
      "172.16.0.0",
      "172.31.255.255",
      "192.168.0.0",
      "192.168.255.255",
    ];

    if (privateIPs.some((privateIP) => ipAddress.startsWith(privateIP))) {
      this.logger.debug(
        `Private/local IP detected: ${ipAddress}, using Ghana as default`,
      );
      return {
        countryCode: "GH",
        localCurrencyCode: "GHS",
        localCurrencyName: "Ghanaian Cedi",
      };
    }

    try {
      // Use ipapi.co - free, reliable, no API key required
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
        timeout: 5000, // 5 second timeout
        headers: {
          "User-Agent": "TipsterApp/1.0",
        },
      });

      if (response.data && response.data.country_code) {
        const countryCode = response.data.country_code.toUpperCase();
        this.logger.debug(
          `Country detected for IP ${ipAddress}: ${countryCode}`,
        );

        // Return basic country info - currency will be determined from CountrySettings
        return {
          countryCode,
          localCurrencyCode: "USD", // Placeholder, will be overridden by CountrySettings
          localCurrencyName: "US Dollar", // Placeholder, will be overridden by CountrySettings
        };
      }

      this.logger.warn(`No country code found for IP ${ipAddress}`);
      return {
        countryCode: "GH",
        localCurrencyCode: "GHS",
        localCurrencyName: "Ghanaian Cedi",
      };
    } catch (error) {
      this.logger.error(`IP geolocation error for ${ipAddress}:`, error);
      return {
        countryCode: "GH",
        localCurrencyCode: "GHS",
        localCurrencyName: "Ghanaian Cedi",
      };
    }
  }
}
