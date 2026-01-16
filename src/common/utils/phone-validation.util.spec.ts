import { BadRequestException } from "@nestjs/common";
import { PhoneValidationUtil } from "./phone-validation.util";

describe("PhoneValidationUtil", () => {
  describe("validateGhanaianPhoneNumber", () => {
    it("should validate a correct Ghanaian phone number starting with 0", () => {
      const result =
        PhoneValidationUtil.validateGhanaianPhoneNumber("0241234567");
      expect(result).toBe("0241234567");
    });

    it("should validate a phone number with +233 prefix", () => {
      const result =
        PhoneValidationUtil.validateGhanaianPhoneNumber("+233241234567");
      expect(result).toBe("0241234567");
    });

    it("should validate a phone number with 233 prefix (no +)", () => {
      const result =
        PhoneValidationUtil.validateGhanaianPhoneNumber("233241234567");
      expect(result).toBe("0241234567");
    });

    it("should handle phone numbers with spaces and dashes", () => {
      const result =
        PhoneValidationUtil.validateGhanaianPhoneNumber("024 123 4567");
      expect(result).toBe("0241234567");
    });

    it("should validate MTN numbers", () => {
      const mtnPrefixes = ["024", "025", "053", "054", "055", "059"];
      mtnPrefixes.forEach((prefix) => {
        const phoneNumber = `${prefix}1234567`;
        const result =
          PhoneValidationUtil.validateGhanaianPhoneNumber(phoneNumber);
        expect(result).toBe(phoneNumber);
      });
    });

    it("should validate Vodafone numbers", () => {
      const vodafonePrefixes = ["020", "050"];
      vodafonePrefixes.forEach((prefix) => {
        const phoneNumber = `${prefix}1234567`;
        const result =
          PhoneValidationUtil.validateGhanaianPhoneNumber(phoneNumber);
        expect(result).toBe(phoneNumber);
      });
    });

    it("should validate AirtelTigo numbers", () => {
      const airtelTigoPrefixes = ["026", "027", "056", "057"];
      airtelTigoPrefixes.forEach((prefix) => {
        const phoneNumber = `${prefix}1234567`;
        const result =
          PhoneValidationUtil.validateGhanaianPhoneNumber(phoneNumber);
        expect(result).toBe(phoneNumber);
      });
    });

    it("should validate Glo numbers", () => {
      const result =
        PhoneValidationUtil.validateGhanaianPhoneNumber("0231234567");
      expect(result).toBe("0231234567");
    });

    it("should throw an error for invalid prefix", () => {
      expect(() => {
        PhoneValidationUtil.validateGhanaianPhoneNumber("0101234567");
      }).toThrow(BadRequestException);
    });

    it("should throw an error for too short number", () => {
      expect(() => {
        PhoneValidationUtil.validateGhanaianPhoneNumber("024123");
      }).toThrow(BadRequestException);
    });

    it("should throw an error for too long number", () => {
      expect(() => {
        PhoneValidationUtil.validateGhanaianPhoneNumber("024123456789");
      }).toThrow(BadRequestException);
    });

    it("should throw an error for empty string", () => {
      expect(() => {
        PhoneValidationUtil.validateGhanaianPhoneNumber("");
      }).toThrow(BadRequestException);
    });

    it("should throw an error for non-numeric characters", () => {
      expect(() => {
        PhoneValidationUtil.validateGhanaianPhoneNumber("024ABC4567");
      }).toThrow(BadRequestException);
    });

    it("should use custom field name in error message", () => {
      try {
        PhoneValidationUtil.validateGhanaianPhoneNumber(
          "invalid",
          "Custom Field"
        );
        fail("Should have thrown an exception");
      } catch (error: any) {
        expect(error.message).toContain("Custom Field");
        expect(error.message).toBe(
          "Custom Field must be a valid Ghanaian phone number"
        );
      }
    });
  });

  describe("isValidPhoneNumber", () => {
    it("should return true for valid phone number", () => {
      const result = PhoneValidationUtil.isValidPhoneNumber("0241234567");
      expect(result).toBe(true);
    });

    it("should return false for invalid phone number", () => {
      const result = PhoneValidationUtil.isValidPhoneNumber("0101234567");
      expect(result).toBe(false);
    });
  });

  describe("formatPhoneNumber", () => {
    it("should format a valid phone number", () => {
      const result = PhoneValidationUtil.formatPhoneNumber("0241234567");
      expect(result).toBe("024 123 4567");
    });

    it("should return original string for invalid number", () => {
      const result = PhoneValidationUtil.formatPhoneNumber("invalid");
      expect(result).toBe("invalid");
    });
  });

  describe("getNetworkName", () => {
    it("should return MTN for MTN numbers", () => {
      expect(PhoneValidationUtil.getNetworkName("0241234567")).toBe("MTN");
      expect(PhoneValidationUtil.getNetworkName("0251234567")).toBe("MTN");
      expect(PhoneValidationUtil.getNetworkName("0541234567")).toBe("MTN");
    });

    it("should return Vodafone for Vodafone numbers", () => {
      expect(PhoneValidationUtil.getNetworkName("0201234567")).toBe("Vodafone");
      expect(PhoneValidationUtil.getNetworkName("0501234567")).toBe("Vodafone");
    });

    it("should return AirtelTigo for AirtelTigo numbers", () => {
      expect(PhoneValidationUtil.getNetworkName("0261234567")).toBe(
        "AirtelTigo"
      );
      expect(PhoneValidationUtil.getNetworkName("0271234567")).toBe(
        "AirtelTigo"
      );
    });

    it("should return Glo for Glo numbers", () => {
      expect(PhoneValidationUtil.getNetworkName("0231234567")).toBe("Glo");
    });

    it("should return Unknown for invalid numbers", () => {
      expect(PhoneValidationUtil.getNetworkName("invalid")).toBe("Unknown");
    });
  });
});
