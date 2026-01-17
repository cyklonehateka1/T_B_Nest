import { BadRequestException } from "@nestjs/common";
export class PhoneValidationUtil {
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
  static validateGhanaianPhoneNumber(
    phoneNumber: string,
    fieldName: string = "Phone number",
  ): string {
    if (!phoneNumber) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    let cleanedNumber = phoneNumber.replace(/[\s\-()]/g, "");
    if (cleanedNumber.startsWith("+233")) {
      cleanedNumber = "0" + cleanedNumber.substring(4);
    } else if (cleanedNumber.startsWith("233")) {
      cleanedNumber = "0" + cleanedNumber.substring(3);
    }
    if (!this.isValidGhanaianNumber(cleanedNumber)) {
      throw new BadRequestException(`Invalid phone number`);
    }
    return cleanedNumber;
  }
  private static isValidGhanaianNumber(number: string): boolean {
    if (!/^0\d{9}$/.test(number)) {
      return false;
    }
    const prefix = number.substring(0, 3);
    return this.VALID_PREFIXES.includes(prefix);
  }
  static isValidPhoneNumber(phoneNumber: string): boolean {
    try {
      this.validateGhanaianPhoneNumber(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }
  static formatPhoneNumber(phoneNumber: string): string {
    try {
      const normalized = this.validateGhanaianPhoneNumber(phoneNumber);
      return `${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6)}`;
    } catch {
      return phoneNumber;
    }
  }
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
