import { BadRequestException } from "@nestjs/common";

/**
 * Validates Ghanaian phone numbers
 * Accepted formats:
 * - 0XXXXXXXXX (10 digits starting with 0)
 * - 233XXXXXXXXX (12 digits starting with 233)
 * - +233XXXXXXXXX (12 digits with + prefix)
 *
 * Valid network prefixes:
 * MTN: 024, 025, 053, 054, 055, 059
 * Vodafone: 020, 050
 * AirtelTigo: 026, 027, 056, 057
 * Glo: 023
 */
export class PhoneValidationUtil {
  // Valid Ghanaian mobile network prefixes
  private static readonly VALID_PREFIXES = [
    "020",
    "023",
    "024",
    "025",
    "026",
    "027",
    "028",
    "050",
    "053",
    "054",
    "055",
    "056",
    "057",
    "059",
  ];

  /**
   * Validate a Ghanaian phone number
   * @param phoneNumber - The phone number to validate
   * @param fieldName - Optional field name for error messages
   * @returns The normalized phone number (format: 0XXXXXXXXX)
   * @throws BadRequestException if the phone number is invalid
   */
  static validateGhanaianPhoneNumber(
    phoneNumber: string,
    fieldName: string = "Phone number",
  ): string {
    if (!phoneNumber) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    // Remove all spaces, dashes, and parentheses
    let cleanedNumber = phoneNumber.replace(/[\s\-()]/g, "");

    // Handle international format with + prefix
    if (cleanedNumber.startsWith("+233")) {
      cleanedNumber = "0" + cleanedNumber.substring(4);
    }
    // Handle international format without + prefix
    else if (cleanedNumber.startsWith("233")) {
      cleanedNumber = "0" + cleanedNumber.substring(3);
    }

    // Validate the cleaned number format
    if (!this.isValidGhanaianNumber(cleanedNumber)) {
      throw new BadRequestException(`Invalid phone number`);
    }

    return cleanedNumber;
  }

  /**
   * Check if the number is a valid Ghanaian phone number
   * @param number - The number to check (should be in format 0XXXXXXXXX)
   * @returns true if valid, false otherwise
   */
  private static isValidGhanaianNumber(number: string): boolean {
    // Must be exactly 10 digits and start with 0
    if (!/^0\d{9}$/.test(number)) {
      return false;
    }

    // Extract the prefix (first 3 digits)
    const prefix = number.substring(0, 3);

    // Check if the prefix is valid
    return this.VALID_PREFIXES.includes(prefix);
  }

  /**
   * Check if a phone number is valid without throwing an exception
   * @param phoneNumber - The phone number to validate
   * @returns true if valid, false otherwise
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    try {
      this.validateGhanaianPhoneNumber(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format a Ghanaian phone number for display
   * @param phoneNumber - The phone number to format
   * @returns Formatted phone number (e.g., 024 123 4567)
   */
  static formatPhoneNumber(phoneNumber: string): string {
    try {
      const normalized = this.validateGhanaianPhoneNumber(phoneNumber);
      // Format as: 024 123 4567
      return `${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6)}`;
    } catch {
      return phoneNumber; // Return original if invalid
    }
  }

  /**
   * Get the network name from a phone number
   * @param phoneNumber - The phone number to check
   * @returns The network name or 'Unknown'
   */
  static getNetworkName(phoneNumber: string): string {
    try {
      const normalized = this.validateGhanaianPhoneNumber(phoneNumber);
      const prefix = normalized.substring(0, 3);

      if (["024", "025", "053", "054", "055", "059"].includes(prefix)) {
        return "MTN";
      } else if (["020", "050"].includes(prefix)) {
        return "Vodafone";
      } else if (["026", "027", "056", "057"].includes(prefix)) {
        return "AirtelTigo";
      } else if (prefix === "023") {
        return "Glo";
      }

      return "Unknown";
    } catch {
      return "Unknown";
    }
  }
}
