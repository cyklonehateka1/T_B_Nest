// import { Injectable, Logger } from "@nestjs/common";
// import { InjectRepository } from "@nestjs/typeorm";
// import { Repository } from "typeorm";
// import { CountrySettings } from "../entities/country-settings.entity";
// import {
//   Fee,
//   FeeType,
//   TaxType,
//   FeeCalculationType,
// } from "../entities/fee.entity";
// import { CurrencyConversionService } from "../../resources/services/currency-conversion.service";

// export interface ChargeBreakdown {
//   id: string;
//   name: string;
//   type: FeeType;
//   amount: number;
//   rate?: number;
//   calculationType?: FeeCalculationType;
//   currency?: string;
// }

// export interface ChargesCalculationResult {
//   subtotalAmount: number;
//   charges: ChargeBreakdown[];
//   totalAmount: number;
//   countryCode: string;
//   countryName: string;
//   localCurrencyCode?: string;
//   localCurrencyName?: string;
// }

// @Injectable()
// export class ChargesCalculationService {
//   private readonly logger = new Logger(ChargesCalculationService.name);

//   constructor(
//     @InjectRepository(CountrySettings)
//     private readonly countrySettingsRepository: Repository<CountrySettings>,
//     private readonly currencyConversionService: CurrencyConversionService
//   ) {}

//   /**
//    * Calculate all charges (taxes and fees) for an order based on country and subtotal
//    */
//   async calculateCharges(
//     subtotalAmount: number,
//     countryCode: string,
//     localCurrencyCode?: string
//   ): Promise<ChargesCalculationResult> {
//     this.logger.log(
//       `Calculating charges for country: ${countryCode}, subtotal: ${subtotalAmount}, local currency: ${localCurrencyCode}`
//     );

//     // Input validation
//     if (!countryCode || typeof countryCode !== "string") {
//       throw new Error("Country code is required and must be a string");
//     }

//     if (typeof subtotalAmount !== "number" || subtotalAmount < 0) {
//       throw new Error("Subtotal amount must be a positive number");
//     }

//     // Normalize country code
//     const normalizedCountryCode = countryCode.toUpperCase().trim();

//     // Get country settings with fees
//     const countrySettings = await this.countrySettingsRepository.findOne({
//       where: { countryCode: normalizedCountryCode },
//       relations: ["fees", "fees.feeCurrency", "localCurrency"],
//     });

//     // If no configuration found, return default calculation (no charges)
//     if (!countrySettings) {
//       this.logger.warn(
//         `No country settings found for country: ${normalizedCountryCode}, using default (no charges)`
//       );
//       return this.getDefaultCalculation(subtotalAmount, normalizedCountryCode);
//     }

//     // Get local currency info
//     const localCurrency = countrySettings.localCurrency;
//     const effectiveLocalCurrency =
//       localCurrencyCode || localCurrency?.code || "USD";

//     // Calculate all charges
//     const charges: ChargeBreakdown[] = [];
//     let totalChargesAmount = 0;

//     // Process each fee
//     this.logger.log(
//       `Processing ${countrySettings.fees?.length || 0} fees for country ${countrySettings.countryCode}`
//     );

//     // Validate fees array
//     if (!countrySettings.fees || !Array.isArray(countrySettings.fees)) {
//       this.logger.warn(
//         `Invalid fees array for country ${countrySettings.countryCode}: ${JSON.stringify(countrySettings.fees)}`
//       );
//       return this.getDefaultCalculation(
//         subtotalAmount,
//         countrySettings.countryCode
//       );
//     }

//     for (const fee of countrySettings.fees) {
//       // Validate fee object
//       if (!fee || typeof fee !== "object") {
//         this.logger.warn(`Invalid fee object: ${JSON.stringify(fee)}`);
//         continue;
//       }

//       this.logger.log(
//         `Processing fee: ${fee.name}, type: ${fee.type}, enabled: ${fee.enabled}`
//       );

//       if (!fee.enabled) {
//         this.logger.log(`Skipping disabled fee: ${fee.name}`);
//         continue; // Skip disabled fees
//       }

//       // Log fee configuration and validate required fields
//       if (fee.type === FeeType.TAX) {
//         this.logger.log(
//           `Tax fee ${fee.name}: taxType=${fee.taxType}, taxRate=${fee.taxRate}`
//         );

//         // Validate TAX fee has required fields
//         if (fee.taxType === null || fee.taxType === undefined) {
//           this.logger.warn(`Tax fee ${fee.name} missing taxType, skipping`);
//           continue;
//         }
//         if (fee.taxRate === null || fee.taxRate === undefined) {
//           this.logger.warn(`Tax fee ${fee.name} missing taxRate, skipping`);
//           continue;
//         }
//       } else if (fee.type === FeeType.FEE) {
//         this.logger.log(
//           `Fee ${fee.name}: calculationType=${fee.feeCalculationType}, feeValue=${fee.feeValue}, feeCurrency=${fee.feeCurrency?.code}`
//         );

//         // Validate FEE has required fields
//         if (
//           fee.feeCalculationType === null ||
//           fee.feeCalculationType === undefined
//         ) {
//           this.logger.warn(
//             `Fee ${fee.name} missing feeCalculationType, skipping`
//           );
//           continue;
//         }
//         if (fee.feeValue === null || fee.feeValue === undefined) {
//           this.logger.warn(`Fee ${fee.name} missing feeValue, skipping`);
//           continue;
//         }
//       } else {
//         this.logger.warn(
//           `Unknown fee type for ${fee.name}: ${String(fee.type)}`
//         );
//         continue;
//       }

//       const chargeAmount = await this.calculateFeeAmount(
//         fee,
//         subtotalAmount,
//         effectiveLocalCurrency
//       );

//       this.logger.log(
//         `Calculated charge amount for ${fee.name}: ${chargeAmount}`
//       );

//       // Validate charge amount
//       if (isNaN(chargeAmount)) {
//         this.logger.error(
//           `Charge amount is NaN for fee ${fee.name}, skipping this fee`
//         );
//         continue;
//       }

//       if (chargeAmount > 0) {
//         const charge: ChargeBreakdown = {
//           id: fee.id,
//           name: fee.name,
//           type: fee.type,
//           amount: chargeAmount,
//           currency: effectiveLocalCurrency, // All charges are in the order's local currency
//         };

//         // Add type-specific details
//         if (fee.type === FeeType.TAX) {
//           charge.rate = fee.taxRate;
//         } else if (fee.type === FeeType.FEE) {
//           charge.rate = fee.feeValue;
//           charge.calculationType = fee.feeCalculationType;
//         }

//         charges.push(charge);
//         totalChargesAmount += chargeAmount;

//         // Validate total after addition
//         if (isNaN(totalChargesAmount)) {
//           this.logger.error(
//             `Total charges amount became NaN after adding ${fee.name} = ${chargeAmount}`
//           );
//           throw new Error(
//             `Total charges amount became NaN after processing fee ${fee.name}`
//           );
//         }

//         this.logger.log(
//           `Added charge: ${fee.name} = ${chargeAmount}, total so far: ${totalChargesAmount}`
//         );
//       }
//     }

//     // Round total charges amount to avoid floating point precision issues
//     totalChargesAmount = Math.round(totalChargesAmount * 100) / 100;
//     const totalAmount = subtotalAmount + totalChargesAmount;

//     // Validate final amounts
//     if (
//       isNaN(subtotalAmount) ||
//       isNaN(totalChargesAmount) ||
//       isNaN(totalAmount)
//     ) {
//       this.logger.error(
//         `Charges calculation resulted in NaN values: subtotal=${subtotalAmount}, charges=${totalChargesAmount}, total=${totalAmount}`
//       );
//       throw new Error("Charges calculation resulted in invalid values");
//     }

//     this.logger.log(
//       `Charges calculation completed: subtotal=${subtotalAmount}, charges=${totalChargesAmount}, total=${totalAmount}`
//     );

//     return {
//       subtotalAmount,
//       charges,
//       totalAmount,
//       countryCode: countrySettings.countryCode,
//       countryName: countrySettings.name,
//       localCurrencyCode: localCurrency?.code,
//       localCurrencyName: localCurrency?.name,
//     };
//   }

//   /**
//    * Calculate the amount for a specific fee
//    */
//   private async calculateFeeAmount(
//     fee: Fee,
//     subtotalAmount: number,
//     localCurrencyCode: string
//   ): Promise<number> {
//     if (fee.type === FeeType.TAX) {
//       return this.calculateTaxAmount(fee, subtotalAmount);
//     } else if (fee.type === FeeType.FEE) {
//       return this.calculateFeeAmountValue(
//         fee,
//         subtotalAmount,
//         localCurrencyCode
//       );
//     }

//     return 0;
//   }

//   /**
//    * Calculate tax amount
//    */
//   private calculateTaxAmount(fee: Fee, subtotalAmount: number): number {
//     this.logger.log(
//       `Calculating tax for ${fee.name}: taxType=${fee.taxType}, taxRate=${fee.taxRate}, subtotal=${subtotalAmount}`
//     );

//     // Convert and validate inputs for TAX type
//     const taxRate = Number(fee.taxRate);
//     if (
//       fee.taxRate === null ||
//       fee.taxRate === undefined ||
//       isNaN(taxRate) ||
//       taxRate <= 0
//     ) {
//       this.logger.warn(
//         `Invalid tax rate for tax fee ${fee.name}: ${fee.taxRate}`
//       );
//       return 0;
//     }

//     if (isNaN(subtotalAmount) || subtotalAmount < 0) {
//       this.logger.warn(`Invalid subtotal amount: ${subtotalAmount}`);
//       return 0;
//     }

//     if (fee.taxType === TaxType.EXCLUSIVE) {
//       // For exclusive tax, calculate tax to add to subtotal
//       const taxAmount = subtotalAmount * (taxRate / 100);
//       this.logger.log(
//         `Exclusive tax calculation: ${subtotalAmount} * (${taxRate} / 100) = ${taxAmount}`
//       );

//       if (isNaN(taxAmount)) {
//         this.logger.error(
//           `Tax calculation resulted in NaN for fee ${fee.name}: subtotal=${subtotalAmount}, rate=${fee.taxRate}`
//         );
//         return 0;
//       }

//       // Round to 2 decimal places to avoid floating point precision issues
//       const roundedAmount = Math.round(taxAmount * 100) / 100;
//       this.logger.log(`Rounded tax amount: ${roundedAmount}`);
//       return roundedAmount;
//     }

//     if (fee.taxType === TaxType.INCLUSIVE) {
//       // For inclusive tax, the subtotal already includes tax
//       // No additional tax amount to add - the tax is already included in the subtotal
//       this.logger.log(
//         `Inclusive tax - returning 0 (tax already included in subtotal)`
//       );
//       return 0;
//     }

//     this.logger.warn(`Unknown tax type for fee ${fee.name}: ${fee.taxType}`);
//     return 0;
//   }

//   /**
//    * Calculate fee amount (processing, service, etc.)
//    */
//   private async calculateFeeAmountValue(
//     fee: Fee,
//     subtotalAmount: number,
//     localCurrencyCode: string
//   ): Promise<number> {
//     this.logger.log(
//       `Calculating fee for ${fee.name}: calculationType=${fee.feeCalculationType}, feeValue=${fee.feeValue}, subtotal=${subtotalAmount}`
//     );

//     // Convert and validate inputs for FEE type
//     const feeValue = Number(fee.feeValue);
//     if (
//       fee.feeValue === null ||
//       fee.feeValue === undefined ||
//       isNaN(feeValue) ||
//       feeValue <= 0
//     ) {
//       this.logger.warn(
//         `Invalid fee value for fee ${fee.name}: ${fee.feeValue}`
//       );
//       return 0;
//     }

//     if (isNaN(subtotalAmount) || subtotalAmount < 0) {
//       this.logger.warn(`Invalid subtotal amount: ${subtotalAmount}`);
//       return 0;
//     }

//     if (fee.feeCalculationType === FeeCalculationType.PERCENTAGE) {
//       // Percentage-based fee - no currency conversion needed
//       const feeAmount = subtotalAmount * (feeValue / 100);
//       this.logger.log(
//         `Percentage fee calculation: ${subtotalAmount} * (${feeValue} / 100) = ${feeAmount}`
//       );

//       if (isNaN(feeAmount)) {
//         this.logger.error(
//           `Fee calculation resulted in NaN for fee ${fee.name}: subtotal=${subtotalAmount}, value=${fee.feeValue}`
//         );
//         return 0;
//       }

//       // Round to 2 decimal places to avoid floating point precision issues
//       const roundedAmount = Math.round(feeAmount * 100) / 100;
//       this.logger.log(`Rounded fee amount: ${roundedAmount}`);
//       return roundedAmount;
//     } else if (fee.feeCalculationType === FeeCalculationType.FIXED) {
//       // Fixed amount fee - should already be in the country's local currency
//       this.logger.log(`Fixed fee calculation: using fee value ${feeValue}`);

//       // Warn if fee currency doesn't match the order currency (configuration issue)
//       if (fee.feeCurrency && fee.feeCurrency.code !== localCurrencyCode) {
//         this.logger.warn(
//           `Fee "${fee.name}" currency (${fee.feeCurrency.code}) doesn't match order currency (${localCurrencyCode}). This may indicate a configuration error. Using fee amount as-is.`
//         );
//       }

//       // Use fee amount as-is since fees should be configured in the country's local currency
//       return feeValue;
//     }

//     this.logger.warn(
//       `Unknown fee calculation type for fee ${fee.name}: ${fee.feeCalculationType}`
//     );
//     return 0;
//   }

//   /**
//    * Get default calculation when no country settings are found
//    */
//   private getDefaultCalculation(
//     subtotalAmount: number,
//     countryCode: string
//   ): ChargesCalculationResult {
//     return {
//       subtotalAmount,
//       charges: [],
//       totalAmount: subtotalAmount,
//       countryCode,
//       countryName: this.getCountryName(countryCode),
//     };
//   }

//   /**
//    * Get country name by code
//    */
//   private getCountryName(countryCode: string): string {
//     const countries: Record<string, string> = {
//       US: "United States",
//       GB: "United Kingdom",
//       DE: "Germany",
//       FR: "France",
//       IT: "Italy",
//       ES: "Spain",
//       GH: "Ghana",
//       NG: "Nigeria",
//       KE: "Kenya",
//       ZA: "South Africa",
//       CA: "Canada",
//       AU: "Australia",
//       JP: "Japan",
//       NL: "Netherlands",
//       BE: "Belgium",
//       AT: "Austria",
//       CH: "Switzerland",
//       SE: "Sweden",
//       NO: "Norway",
//       DK: "Denmark",
//       FI: "Finland",
//       IE: "Ireland",
//       PT: "Portugal",
//       GR: "Greece",
//       PL: "Poland",
//       CZ: "Czech Republic",
//       HU: "Hungary",
//       RO: "Romania",
//       BG: "Bulgaria",
//       HR: "Croatia",
//       SI: "Slovenia",
//       SK: "Slovakia",
//       LT: "Lithuania",
//       LV: "Latvia",
//       EE: "Estonia",
//       MT: "Malta",
//       CY: "Cyprus",
//       LU: "Luxembourg",
//     };

//     return countries[countryCode.toUpperCase()] || countryCode;
//   }
// }
