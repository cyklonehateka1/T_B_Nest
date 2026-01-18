// import {
//   Injectable,
//   Logger,
//   BadRequestException,
//   NotFoundException,
// } from "@nestjs/common";
// import { ConfigService } from "@nestjs/config";
// import { InjectRepository } from "@nestjs/typeorm";
// import { Repository, DataSource } from "typeorm";
// import axios, { AxiosResponse } from "axios";
// import * as crypto from "crypto";
// import {
//   RefundPayment,
//   RefundPaymentStatus,
// } from "src/entities/refundPayment.entity";
// import {
//   VendorPayout,
//   VendorPayoutStatus,
// } from "src/entities/vendor-payout.entity";

// /**
//  * Palmpay Payout Request Interface
//  * Based on Palmpay payout API documentation
//  */
// export interface PalmpayPayoutRequest {
//   requestTime: number; // Timestamp in milliseconds
//   version: string; // API version (e.g., "V1.1")
//   nonceStr: string; // Random string for request uniqueness
//   orderId: string; // Merchant's order number (refund reference)
//   title?: string; // Order title (optional)
//   description?: string; // Order description (optional)
//   payeeName?: string; // Name of the payee (optional, default: "unknown")
//   payeeBankCode?: string; // Bank or MMO code (required except TZ)
//   payeeBankAccNo: string; // Bank account or MoMo account (required, numeric only)
//   payeePhoneNo?: string; // Payee phone number for Ghana SMS (optional, with country code)
//   amount: number; // Transaction amount in cents/minimum unit
//   currency: string; // Currency (GHS/NGN/TZS/KES)
//   notifyUrl: string; // Webhook URL for payment notifications
//   remark: string; // Remark (required)
// }

// /**
//  * Palmpay Payout Response Interface
//  */
// export interface PalmpayPayoutResponse {
//   currency?: string; // Currency
//   amount?: number; // Order amount (minimum unit) only when orderStatus = 2
//   fee?: {
//     fee: number; // Total fee amount (minimum unit)
//     vat?: number; // VAT amount (optional)
//   }; // Only when orderStatus = 1 or 2
//   orderNo?: string; // The order number responded by Palmpay
//   orderId?: string; // Merchant's original order number
//   orderStatus?: number; // Order Status (0: unpaid, 1: paying, 2: success, 3: fail, 4: close)
//   sessionId?: string; // Channel Response Parameters
//   message?: string; // Order status description
//   errorMsg?: string; // Error message
// }

// export interface PalmpayPayoutApiResponse {
//   respCode: string; // Response code (e.g., "00000000" for success)
//   respMsg: string; // Response message (e.g., "success")
//   data?: PalmpayPayoutResponse;
// }

// /**
//  * Palmpay Payout Webhook Payload
//  * Sent to notifyUrl when payout status changes
//  */
// export interface PalmpayPayoutWebhookPayload {
//   orderNo: string; // Palmpay platform order number
//   orderId: string; // Merchant's order number (refund reference)
//   orderStatus: number; // Order status (0: unpaid, 1: paying, 2: success, 3: fail, 4: close)
//   amount: number; // Transaction amount in cents
//   currency: string; // Currency code
//   fee?: {
//     fee: number;
//     vat?: number;
//   };
//   message?: string; // Status description
//   errorMsg?: string; // Error message if failed
//   sign?: string; // Signature for verification
// }

// export interface PalmpayBankInfo {
//   bankCode: string;
//   bankName: string;
//   bankUrl?: string;
//   bgUrl?: string;
// }

// export interface PalmpayQueryBankListRequest {
//   requestTime: number; // Timestamp in milliseconds
//   version: string; // API version (e.g., "V1.1")
//   nonceStr: string; // Random string for request uniqueness
//   businessType: number; // Business type (0 for payout)
// }

// export interface PalmpayQueryBankListResponse {
//   respCode: string; // Response code (e.g., "00000000" for success)
//   respMsg: string; // Response message (e.g., "success")
//   data?: PalmpayBankInfo | PalmpayBankInfo[]; // Bank info or array of bank info
// }

// export interface PalmpayQueryPayoutStatusRequest {
//   requestTime: number; // Timestamp in milliseconds
//   version: string; // API version (e.g., "V1.1")
//   nonceStr: string; // Random string for request uniqueness
//   orderId?: string; // Merchant's order number (refund reference) - optional if orderNo is provided
//   orderNo?: string; // Palmpay's order number - optional if orderId is provided
// }

// export interface PalmpayQueryPayoutStatusResponse {
//   currency: string; // Currency (e.g., "NGN")
//   amount?: number; // Order amount (minimum unit) only when orderStatus = 2
//   fee?: {
//     fee: number; // Total fee amount (minimum unit)
//     vat?: number; // VAT amount (optional)
//   }; // Only when orderStatus = 1 or 2
//   orderNo: string; // The order number responded by Palmpay
//   orderId: string; // Merchant's original order number
//   orderStatus: number; // Order Status (0: unpaid, 1: paying, 2: success, 3: fail, 4: close)
//   sessionId?: string; // Channel Response Parameters
//   message?: string; // Order status description
//   errorMsg?: string; // Error message
//   createdTime: number; // Order creation time (milliseconds)
//   completedTime?: number; // Order completion time (milliseconds)
// }

// export interface PalmpayQueryPayoutStatusApiResponse {
//   respCode: string; // Response code (e.g., "00000000" for success)
//   respMsg: string; // Response message (e.g., "success")
//   data?: PalmpayQueryPayoutStatusResponse;
// }

// /**
//  * Palmpay Payout Service
//  * Handles sending payouts to customers (refunds) and vendors via Palmpay
//  * This is a reusable service that can be used for both refund payouts and vendor payouts
//  */
// @Injectable()
// export class PalmpayPayoutService {
//   private readonly logger = new Logger(PalmpayPayoutService.name);
//   private readonly appId: string;
//   private readonly baseUrl: string;
//   private readonly privateKey: string;
//   private readonly publicKey?: string;
//   private readonly adminApiBaseUrl: string;

//   // Bank/MMO code mappings for different countries
//   private readonly bankCodeMap: Record<string, Record<string, string>> = {
//     GHS: {
//       // Ghana Mobile Money
//       MTN: "100001",
//       VODAFONE: "100002",
//       AIRTELTIGO: "100003",
//       // Ghana Banks (if needed)
//       // Add bank codes as needed
//     },
//     TZS: {
//       // Tanzania Mobile Money
//       VODACOM: "200001",
//       TIGO: "200002",
//       AIRTEL: "200003",
//       // Tanzania Banks (if needed)
//     },
//     KES: {
//       // Kenya Mobile Money
//       MPESA: "300001",
//       AIRTEL: "300002",
//       // Kenya Banks (if needed)
//     },
//     NGN: {
//       // Nigeria Banks
//       // Add bank codes as needed
//     },
//   };

//   constructor(
//     private readonly configService: ConfigService,
//     @InjectRepository(RefundPayment)
//     private readonly refundPaymentRepository: Repository<RefundPayment>,
//     @InjectRepository(VendorPayout)
//     private readonly vendorPayoutRepository: Repository<VendorPayout>,
//     private readonly dataSource: DataSource,
//   ) {
//     const appId = this.configService.get<string>("PALMPAY_APP_ID");
//     if (!appId) {
//       throw new Error("PALMPAY_APP_ID is not configured");
//     }
//     this.appId = appId;

//     const baseUrl = this.configService.get<string>("PALMPAY_BASE_URL");
//     if (!baseUrl) {
//       throw new Error("PALMPAY_BASE_URL is not configured");
//     }
//     this.baseUrl = baseUrl;

//     const privateKey = this.configService.get<string>("PALMPAY_PRIVATE_KEY");
//     if (!privateKey) {
//       throw new Error("PALMPAY_PRIVATE_KEY is not configured");
//     }
//     this.privateKey = privateKey;

//     const adminApiBaseUrl = this.configService.get<string>("ADMIN_API_BASEURL");
//     if (!adminApiBaseUrl) {
//       throw new Error("ADMIN_API_BASEURL environment variable is required");
//     }
//     this.adminApiBaseUrl = adminApiBaseUrl;

//     // Optional public key for webhook signature verification
//     this.publicKey =
//       this.configService.get<string>("PALMPAY_PUBLIC_KEY") || undefined;
//   }

//   /**
//    * Query bank list from Palmpay for a specific country
//    * @param currency Currency code (GHS, NGN, TZS, KES) - used to determine country code
//    * @param businessType Business type (0 for payout)
//    * @returns List of banks/MMO networks with their codes
//    */
//   async queryBankList(
//     currency: string,
//     businessType: number = 0,
//   ): Promise<{
//     success: boolean;
//     banks?: PalmpayBankInfo[];
//     message: string;
//     error?: string;
//   }> {
//     try {
//       // Extract country code from currency
//       const countryCodeMap: Record<string, string> = {
//         GHS: "GH",
//         NGN: "NG",
//         KES: "KE",
//         TZS: "TZ",
//       };
//       const countryCode = countryCodeMap[currency.toUpperCase()] || "NG";

//       // Generate nonce string
//       const nonceStr = this.generateNonce();

//       // Build query bank list request
//       const queryRequest: PalmpayQueryBankListRequest = {
//         requestTime: Date.now(),
//         version: "V1.1",
//         nonceStr,
//         businessType,
//       };

//       // Make API request with country code in header
//       const response = await this.makeApiRequest(
//         "/api/v2/general/merchant/queryBankList",
//         queryRequest,
//         countryCode,
//       );

//       if (!response.success) {
//         const errorMsg = response.message || "Palmpay bank list query failed";
//         this.logger.error("Palmpay bank list query failed:", {
//           currency,
//           countryCode,
//           response,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: response.error || errorMsg,
//         };
//       }

//       // Handle response
//       const apiResponse = response.data as PalmpayQueryBankListResponse;

//       if (!apiResponse) {
//         return {
//           success: false,
//           message: "Empty response from Palmpay API",
//           error: "Empty response",
//         };
//       }

//       // Check response code
//       const respCode = apiResponse.respCode;
//       if (respCode && respCode !== "00000" && respCode !== "00000000") {
//         const errorMsg =
//           apiResponse.respMsg || `Palmpay API error: ${respCode}`;
//         this.logger.error("Palmpay bank list query returned an error:", {
//           currency,
//           countryCode,
//           respCode,
//           respMsg: apiResponse.respMsg,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: respCode,
//         };
//       }

//       // Handle data - can be single object or array
//       let banks: PalmpayBankInfo[] = [];
//       if (Array.isArray(apiResponse.data)) {
//         banks = apiResponse.data;
//       } else if (apiResponse.data) {
//         banks = [apiResponse.data];
//       }

//       return {
//         success: true,
//         banks,
//         message: apiResponse.respMsg || "Bank list retrieved successfully",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay bank list query failed:", {
//         error: error.message,
//         currency,
//       });
//       return {
//         success: false,
//         message: error.message || "Bank list query failed",
//         error: error.message,
//       };
//     }
//   }

//   /**
//    * Find bank code by bank name or network name
//    * Queries Palmpay API to get the bank code dynamically
//    * @param currency Currency code
//    * @param bankName Bank name or mobile money network name
//    * @returns Bank code if found
//    */
//   async findBankCode(
//     currency: string,
//     bankName: string,
//   ): Promise<string | null> {
//     try {
//       const result = await this.queryBankList(currency);
//       if (!result.success || !result.banks) {
//         return null;
//       }

//       // Search for bank by name (case-insensitive)
//       const normalizedSearchName = bankName.toUpperCase().trim();
//       const bank = result.banks.find(
//         (b) =>
//           b.bankName.toUpperCase().trim() === normalizedSearchName ||
//           b.bankName.toUpperCase().includes(normalizedSearchName) ||
//           normalizedSearchName.includes(b.bankName.toUpperCase().trim()),
//       );

//       return bank ? bank.bankCode : null;
//     } catch (error) {
//       this.logger.error("Failed to find bank code:", {
//         error: error.message,
//         currency,
//         bankName,
//       });
//       return null;
//     }
//   }

//   /**
//    * Initiate a payout to customer for refund
//    */
//   async initiatePayout(refund: RefundPayment): Promise<{
//     success: boolean;
//     orderNo?: string;
//     message: string;
//     error?: string;
//   }> {
//     try {
//       // Validate refund has required account information
//       if (!refund.accountNumber) {
//         throw new BadRequestException(
//           "Refund account number is required for payout",
//         );
//       }

//       // Validate currency is supported
//       const supportedCurrencies = ["GHS", "NGN", "TZS", "KES"];
//       if (!supportedCurrencies.includes(refund.currency)) {
//         throw new BadRequestException(
//           `Currency ${refund.currency} is not supported for Palmpay payouts`,
//         );
//       }

//       // Get bank code from refund metadata (stored from user's refundAccountDetails)
//       // If not in metadata, fall back to querying by bankName
//       let payeeBankCode: string | undefined;

//       if (refund.metadata?.bankCode) {
//         // Use bank code directly from user's refund account details
//         payeeBankCode = refund.metadata.bankCode;
//         this.logger.log(`Using bank code from user profile: ${payeeBankCode}`);
//       } else if (refund.bankName) {
//         // Fall back to querying Palmpay API by bank name
//         this.logger.log(
//           `Bank code not in metadata, querying Palmpay API for bank: ${refund.bankName}`,
//         );
//         payeeBankCode =
//           (await this.findBankCode(refund.currency, refund.bankName)) ||
//           undefined;
//       }

//       // TZ (Tanzania) doesn't require bank code, others do
//       if (!payeeBankCode && refund.currency !== "TZS") {
//         throw new BadRequestException(
//           `Bank/MMO code is required for ${refund.currency} payouts. Please ensure the user has configured bankCode in their refund account details.`,
//         );
//       }

//       // Log account details being used for payout (for debugging)
//       this.logger.log("Initiating Palmpay payout with account details:", {
//         refundId: refund.id,
//         refundReference: refund.refundReference,
//         currency: refund.currency,
//         bankCode: payeeBankCode,
//         accountNumber: refund.accountNumber.replace(/\D/g, ""),
//         accountName: refund.accountName,
//         phoneNumber: refund.phoneNumber,
//         amount: refund.amount,
//       });

//       // Convert amount to cents (Palmpay expects amount in cents)
//       const amountInCents = Math.round(refund.amount * 100);

//       // Generate nonce string
//       const nonceStr = this.generateNonce();

//       // Build payout request with only required fields
//       const payoutRequest: PalmpayPayoutRequest = {
//         requestTime: Date.now(),
//         version: "V1.1",
//         nonceStr,
//         orderId: refund.refundReference || refund.id,
//         payeeBankCode: payeeBankCode,
//         payeeBankAccNo: refund.accountNumber.replace(/\D/g, ""), // Remove non-numeric characters
//         amount: amountInCents,
//         currency: refund.currency,
//         notifyUrl: `${this.adminApiBaseUrl}/api/v1/refunds/palmpay-payout-webhook`,
//         remark: refund.reason || `Refund for ${refund.refundReference}`,
//       };

//       // Determine country code from currency
//       const countryCodeMap: Record<string, string> = {
//         GHS: "GH",
//         NGN: "NG",
//         KES: "KE",
//         TZS: "TZ",
//       };
//       const countryCode = countryCodeMap[refund.currency.toUpperCase()] || "GH";

//       // Log request body to console in red for visibility
//       // eslint-disable-next-line no-console
//       console.error("\x1b[31m%s\x1b[0m", "=== PALMPAY PAYOUT REQUEST ===");
//       // eslint-disable-next-line no-console
//       console.error(
//         "\x1b[31m%s\x1b[0m",
//         JSON.stringify(payoutRequest, null, 2),
//       );
//       // eslint-disable-next-line no-console
//       console.error(
//         "\x1b[31m%s\x1b[0m",
//         `Country Code in Header: ${countryCode} (from currency: ${refund.currency})`,
//       );
//       // eslint-disable-next-line no-console
//       console.error("\x1b[31m%s\x1b[0m", "=== END PALMPAY PAYOUT REQUEST ===");

//       // Make API request with explicit country code
//       const response = await this.makeApiRequest(
//         "/api/v2/merchant/payment/payout",
//         payoutRequest,
//         countryCode,
//       );

//       if (!response.success) {
//         const errorMsg =
//           response.message || "Palmpay payout API request failed";
//         const errorCode = response.error || "UNKNOWN";

//         // Use error message from Palmpay API
//         const userFriendlyMessage = errorMsg;

//         this.logger.error("Palmpay payout API request failed:", {
//           refundId: refund.id,
//           refundReference: refund.refundReference,
//           errorCode,
//           errorMessage: errorMsg,
//           accountNumber: refund.accountNumber,
//           bankCode: payeeBankCode,
//           currency: refund.currency,
//           response,
//         });
//         return {
//           success: false,
//           message: userFriendlyMessage,
//           error: errorCode,
//         };
//       }

//       // Handle response
//       const apiResponse = response.data as PalmpayPayoutApiResponse;

//       if (!apiResponse) {
//         return {
//           success: false,
//           message: "Empty response from Palmpay API",
//           error: "Empty response",
//         };
//       }

//       // Check response code
//       const respCode = apiResponse.respCode;
//       if (respCode && respCode !== "00000" && respCode !== "00000000") {
//         const errorMsg =
//           apiResponse.respMsg ||
//           apiResponse.data?.errorMsg ||
//           `Palmpay API error: ${respCode}`;
//         this.logger.error("Palmpay payout API returned an error:", {
//           refundId: refund.id,
//           refundReference: refund.refundReference,
//           respCode,
//           respMsg: apiResponse.respMsg,
//           errorMsg: apiResponse.data?.errorMsg,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: respCode,
//         };
//       }

//       // Extract order number
//       const orderNo = apiResponse.data?.orderNo;
//       if (!orderNo) {
//         this.logger.error("Palmpay payout orderNo is missing:", {
//           refundId: refund.id,
//           refundReference: refund.refundReference,
//           apiResponse,
//         });
//         return {
//           success: false,
//           message: "Palmpay API did not return a valid order number for payout",
//           error: "Missing orderNo",
//         };
//       }

//       // Update refund with payout transaction ID
//       // Note: This should be saved by the caller within their transaction
//       refund.providerTransactionId = orderNo;
//       refund.providerReference = orderNo;
//       refund.status = this.mapPalmpayStatusToRefundStatus(
//         apiResponse.data?.orderStatus ?? 0,
//       );
//       // Don't save here - let the caller's transaction handle it

//       return {
//         success: true,
//         orderNo,
//         message:
//           apiResponse.data?.message ||
//           apiResponse.respMsg ||
//           "Payout initiated successfully",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay payout initiation failed:", {
//         error: error.message,
//         refundId: refund.id,
//       });
//       return {
//         success: false,
//         message: error.message || "Payout initiation failed",
//         error: error.message,
//       };
//     }
//   }

//   /**
//    * Query payout status from Palmpay
//    * @param orderId Merchant's order number (refund reference)
//    * @param orderNo Palmpay's order number
//    * @param currency Currency code (for country code determination)
//    * @returns Payout status information
//    */
//   async queryPayoutStatus(
//     orderId?: string,
//     orderNo?: string,
//     currency: string = "NGN",
//   ): Promise<{
//     success: boolean;
//     status?: PalmpayQueryPayoutStatusResponse;
//     message: string;
//     error?: string;
//   }> {
//     try {
//       // Validate that at least one identifier is provided
//       if (!orderId && !orderNo) {
//         throw new BadRequestException(
//           "Either orderId or orderNo must be provided to query payout status",
//         );
//       }

//       // Generate nonce string
//       const nonceStr = this.generateNonce();

//       // Build query status request
//       const queryRequest: PalmpayQueryPayoutStatusRequest = {
//         requestTime: Date.now(),
//         version: "V1.1",
//         nonceStr,
//         orderId,
//         orderNo,
//       };

//       // Extract country code from currency
//       const countryCodeMap: Record<string, string> = {
//         GHS: "GH",
//         NGN: "NG",
//         KES: "KE",
//         TZS: "TZ",
//       };
//       const countryCode = countryCodeMap[currency.toUpperCase()] || "NG";

//       // Make API request
//       const response = await this.makeApiRequest(
//         "/api/v2/merchant/payment/queryPayStatus",
//         queryRequest,
//         countryCode,
//       );

//       if (!response.success) {
//         const errorMsg =
//           response.message || "Palmpay payout status query failed";
//         this.logger.error("Palmpay payout status query failed:", {
//           orderId,
//           orderNo,
//           response,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: response.error || errorMsg,
//         };
//       }

//       // Handle response
//       const apiResponse = response.data as PalmpayQueryPayoutStatusApiResponse;

//       if (!apiResponse) {
//         return {
//           success: false,
//           message: "Empty response from Palmpay API",
//           error: "Empty response",
//         };
//       }

//       // Check response code
//       const respCode = apiResponse.respCode;
//       if (respCode && respCode !== "00000" && respCode !== "00000000") {
//         const errorMsg =
//           apiResponse.respMsg ||
//           apiResponse.data?.errorMsg ||
//           `Palmpay API error: ${respCode}`;
//         this.logger.error("Palmpay payout status query returned an error:", {
//           orderId,
//           orderNo,
//           respCode,
//           respMsg: apiResponse.respMsg,
//           errorMsg: apiResponse.data?.errorMsg,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: respCode,
//         };
//       }

//       // Extract status data
//       const statusData = apiResponse.data;
//       if (!statusData) {
//         return {
//           success: false,
//           message: "Empty data in Palmpay API response",
//           error: "Empty data",
//         };
//       }

//       return {
//         success: true,
//         status: statusData,
//         message:
//           statusData.message ||
//           apiResponse.respMsg ||
//           "Status retrieved successfully",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay payout status query failed:", {
//         error: error.message,
//         orderId,
//         orderNo,
//       });
//       return {
//         success: false,
//         message: error.message || "Status query failed",
//         error: error.message,
//       };
//     }
//   }

//   /**
//    * Handle payout webhook from Palmpay
//    */
//   async handlePayoutWebhook(
//     webhookPayload: PalmpayPayoutWebhookPayload,
//   ): Promise<{ success: boolean; message: string }> {
//     try {
//       // Validate required fields
//       if (!webhookPayload.orderId) {
//         throw new BadRequestException(
//           "Invalid webhook payload: missing orderId",
//         );
//       }

//       if (!webhookPayload.orderNo) {
//         throw new BadRequestException(
//           "Invalid webhook payload: missing orderNo",
//         );
//       }

//       if (webhookPayload.orderStatus === undefined) {
//         throw new BadRequestException(
//           "Invalid webhook payload: missing orderStatus",
//         );
//       }

//       // Verify signature if provided
//       if (webhookPayload.sign && this.publicKey) {
//         const isValid = this.verifyWebhookSignature(
//           webhookPayload,
//           webhookPayload.sign,
//         );
//         if (!isValid) {
//           this.logger.error(
//             "Palmpay payout webhook signature verification failed",
//             {
//               orderId: webhookPayload.orderId,
//               orderNo: webhookPayload.orderNo,
//             },
//           );
//           throw new BadRequestException(
//             "Webhook signature verification failed",
//           );
//         }
//       }

//       // Find refund by refund reference (orderId) or provider transaction ID
//       const refund = await this.refundPaymentRepository.findOne({
//         where: [
//           { refundReference: webhookPayload.orderId },
//           { providerTransactionId: webhookPayload.orderNo },
//         ],
//         relations: ["order", "orderPayment", "user"],
//       });

//       if (!refund) {
//         this.logger.warn(
//           `Refund not found for orderId: ${webhookPayload.orderId} or orderNo: ${webhookPayload.orderNo}`,
//         );
//         throw new NotFoundException(
//           `Refund not found for orderId: ${webhookPayload.orderId}`,
//         );
//       }

//       // Validate appId if provided in webhook (if Palmpay includes it)
//       // Note: Palmpay payout webhooks might not include appId, so this is optional

//       // Validate currency matches
//       if (
//         webhookPayload.currency &&
//         webhookPayload.currency !== refund.currency
//       ) {
//         const errorMsg = `Currency mismatch: expected ${refund.currency}, received ${webhookPayload.currency}`;
//         this.logger.error(errorMsg, {
//           refundId: refund.id,
//           orderId: webhookPayload.orderId,
//           expectedCurrency: refund.currency,
//           receivedCurrency: webhookPayload.currency,
//         });
//         throw new BadRequestException(errorMsg);
//       }

//       // Validate amount matches (convert from cents)
//       const expectedAmountInCents = Math.round(refund.amount * 100);
//       if (webhookPayload.amount !== expectedAmountInCents) {
//         const errorMsg = `Payout amount mismatch: expected ${refund.amount} ${refund.currency} (${expectedAmountInCents} cents), received ${webhookPayload.amount / 100} ${webhookPayload.currency || refund.currency} (${webhookPayload.amount} cents)`;
//         this.logger.error(errorMsg, {
//           refundId: refund.id,
//           orderId: webhookPayload.orderId,
//           expectedAmount: refund.amount,
//           expectedAmountInCents,
//           receivedAmountInCents: webhookPayload.amount,
//           receivedAmount: webhookPayload.amount / 100,
//           currency: refund.currency,
//         });
//         throw new BadRequestException(errorMsg);
//       }

//       // Check for duplicate webhook processing (idempotency)
//       const mappedStatus = this.mapPalmpayStatusToRefundStatus(
//         webhookPayload.orderStatus,
//       );
//       if (
//         refund.providerTransactionId === webhookPayload.orderNo &&
//         refund.status === mappedStatus
//       ) {
//         return {
//           success: true,
//           message: "Webhook already processed (idempotent)",
//         };
//       }

//       // Update refund status
//       refund.providerTransactionId = webhookPayload.orderNo;
//       refund.providerReference = webhookPayload.orderNo;
//       refund.providerStatus = String(webhookPayload.orderStatus);
//       refund.status = mappedStatus;

//       // Update processedAt if payout is completed
//       if (webhookPayload.orderStatus === 2) {
//         refund.processedAt = new Date();
//       }

//       // Store fee information if provided
//       if (webhookPayload.fee) {
//         refund.metadata = {
//           ...(refund.metadata || {}),
//           payoutFee: webhookPayload.fee.fee / 100, // Convert from cents
//           payoutVat: webhookPayload.fee.vat
//             ? webhookPayload.fee.vat / 100
//             : undefined,
//         };
//       }

//       // Save refund updates within transaction
//       const queryRunner = this.dataSource.createQueryRunner();
//       await queryRunner.connect();
//       await queryRunner.startTransaction();

//       try {
//         await queryRunner.manager.save(RefundPayment, refund);
//         await queryRunner.commitTransaction();
//       } catch (transactionError) {
//         await queryRunner.rollbackTransaction();
//         this.logger.error(
//           `Transaction rolled back for payout webhook processing - refund ${refund.id}: ${transactionError.message}`,
//         );
//         throw transactionError;
//       } finally {
//         await queryRunner.release();
//       }

//       return {
//         success: true,
//         message: "Payout webhook processed successfully",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay payout webhook handling failed", {
//         error: error.message,
//         orderId: webhookPayload?.orderId,
//       });
//       throw error;
//     }
//   }

//   /**
//    * Initiate a payout to vendor for completed order items
//    * @param vendorPayout VendorPayout entity with order item details
//    * @returns Payout initiation result
//    */
//   async initiateVendorPayout(vendorPayout: VendorPayout): Promise<{
//     success: boolean;
//     orderNo?: string;
//     message: string;
//     error?: string;
//   }> {
//     try {
//       // Validate vendor payout has required account information
//       if (!vendorPayout.accountNumber) {
//         throw new BadRequestException(
//           "Vendor account number is required for payout",
//         );
//       }

//       if (!vendorPayout.bankCode) {
//         throw new BadRequestException(
//           "Vendor bank code is required for payout",
//         );
//       }

//       // Validate currency is supported
//       const supportedCurrencies = ["GHS", "NGN", "TZS", "KES"];
//       if (!supportedCurrencies.includes(vendorPayout.currency)) {
//         throw new BadRequestException(
//           `Currency ${vendorPayout.currency} is not supported for Palmpay payouts`,
//         );
//       }

//       // TZ (Tanzania) doesn't require bank code, others do
//       if (!vendorPayout.bankCode && vendorPayout.currency !== "TZS") {
//         throw new BadRequestException(
//           `Bank/MMO code is required for ${vendorPayout.currency} payouts`,
//         );
//       }

//       this.logger.log("Initiating Palmpay vendor payout:", {
//         vendorPayoutId: vendorPayout.id,
//         vendorId: vendorPayout.vendorId,
//         orderId: vendorPayout.orderId,
//         currency: vendorPayout.currency,
//         bankCode: vendorPayout.bankCode,
//         accountNumber: vendorPayout.accountNumber.replace(/\D/g, ""),
//         accountName: vendorPayout.accountName,
//         amount: vendorPayout.amount,
//         grossAmount: vendorPayout.grossAmount,
//       });

//       // Convert amount to cents (Palmpay expects amount in cents)
//       const amountInCents = Math.round(vendorPayout.amount * 100);

//       // Generate nonce string
//       const nonceStr = this.generateNonce();

//       // Generate payout reference from vendor payout ID
//       const payoutReference = `VENDOR-PAYOUT-${vendorPayout.id.substring(0, 8).toUpperCase()}-${Date.now()}`;

//       // Build payout request
//       const payoutRequest: PalmpayPayoutRequest = {
//         requestTime: Date.now(),
//         version: "V1.1",
//         nonceStr,
//         orderId: payoutReference,
//         payeeBankCode: vendorPayout.bankCode,
//         payeeBankAccNo: vendorPayout.accountNumber.replace(/\D/g, ""), // Remove non-numeric characters
//         payeeName: vendorPayout.accountName,
//         amount: amountInCents,
//         currency: vendorPayout.currency,
//         notifyUrl: `${this.adminApiBaseUrl}/api/v1/vendor-payouts/palmpay-webhook`,
//         remark:
//           vendorPayout.reason ||
//           `Vendor payout for order ${vendorPayout.orderId}`,
//       };

//       // Determine country code from currency
//       const countryCodeMap: Record<string, string> = {
//         GHS: "GH",
//         NGN: "NG",
//         KES: "KE",
//         TZS: "TZ",
//       };
//       const countryCode =
//         countryCodeMap[vendorPayout.currency.toUpperCase()] || "GH";

//       // Make API request
//       const response = await this.makeApiRequest(
//         "/api/v2/merchant/payment/payout",
//         payoutRequest,
//         countryCode,
//       );

//       if (!response.success) {
//         const errorMsg =
//           response.message || "Palmpay vendor payout API request failed";
//         const errorCode = response.error || "UNKNOWN";

//         this.logger.error("Palmpay vendor payout API request failed:", {
//           vendorPayoutId: vendorPayout.id,
//           vendorId: vendorPayout.vendorId,
//           errorCode,
//           errorMessage: errorMsg,
//           accountNumber: vendorPayout.accountNumber,
//           bankCode: vendorPayout.bankCode,
//           currency: vendorPayout.currency,
//           response,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: errorCode,
//         };
//       }

//       // Handle response
//       const apiResponse = response.data as PalmpayPayoutApiResponse;

//       if (!apiResponse) {
//         return {
//           success: false,
//           message: "Empty response from Palmpay API",
//           error: "Empty response",
//         };
//       }

//       // Check response code
//       const respCode = apiResponse.respCode;
//       if (respCode && respCode !== "00000" && respCode !== "00000000") {
//         const errorMsg =
//           apiResponse.respMsg ||
//           apiResponse.data?.errorMsg ||
//           `Palmpay API error: ${respCode}`;
//         this.logger.error("Palmpay vendor payout API returned an error:", {
//           vendorPayoutId: vendorPayout.id,
//           vendorId: vendorPayout.vendorId,
//           respCode,
//           respMsg: apiResponse.respMsg,
//           errorMsg: apiResponse.data?.errorMsg,
//         });
//         return {
//           success: false,
//           message: errorMsg,
//           error: respCode,
//         };
//       }

//       // Extract order number
//       const orderNo = apiResponse.data?.orderNo;
//       if (!orderNo) {
//         this.logger.error("Palmpay vendor payout orderNo is missing:", {
//           vendorPayoutId: vendorPayout.id,
//           vendorId: vendorPayout.vendorId,
//           apiResponse,
//         });
//         return {
//           success: false,
//           message: "Palmpay API did not return a valid order number for payout",
//           error: "Missing orderNo",
//         };
//       }

//       // Update vendor payout with payout transaction ID
//       // Note: This should be saved by the caller within their transaction
//       vendorPayout.transactionId = orderNo;
//       vendorPayout.payoutReference = payoutReference;
//       vendorPayout.status = this.mapPalmpayStatusToVendorPayoutStatus(
//         apiResponse.data?.orderStatus ?? 0,
//       );
//       // Don't save here - let the caller's transaction handle it

//       return {
//         success: true,
//         orderNo,
//         message:
//           apiResponse.data?.message ||
//           apiResponse.respMsg ||
//           "Vendor payout initiated successfully",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay vendor payout initiation failed:", {
//         error: error.message,
//         vendorPayoutId: vendorPayout.id,
//       });
//       return {
//         success: false,
//         message: error.message || "Vendor payout initiation failed",
//         error: error.message,
//       };
//     }
//   }

//   /**
//    * Handle vendor payout webhook from Palmpay
//    */
//   async handleVendorPayoutWebhook(
//     webhookPayload: PalmpayPayoutWebhookPayload,
//   ): Promise<{ success: boolean; message: string }> {
//     try {
//       // Validate required fields
//       if (!webhookPayload.orderId) {
//         throw new BadRequestException(
//           "Invalid webhook payload: missing orderId",
//         );
//       }

//       if (!webhookPayload.orderNo) {
//         throw new BadRequestException(
//           "Invalid webhook payload: missing orderNo",
//         );
//       }

//       if (webhookPayload.orderStatus === undefined) {
//         throw new BadRequestException(
//           "Invalid webhook payload: missing orderStatus",
//         );
//       }

//       // Verify signature if provided
//       if (webhookPayload.sign && this.publicKey) {
//         const isValid = this.verifyWebhookSignature(
//           webhookPayload,
//           webhookPayload.sign,
//         );
//         if (!isValid) {
//           this.logger.error(
//             "Palmpay vendor payout webhook signature verification failed",
//             {
//               orderId: webhookPayload.orderId,
//               orderNo: webhookPayload.orderNo,
//             },
//           );
//           throw new BadRequestException(
//             "Webhook signature verification failed",
//           );
//         }
//       }

//       // Find vendor payout by payout reference (orderId contains the reference)
//       const vendorPayout = await this.vendorPayoutRepository.findOne({
//         where: [
//           { payoutReference: webhookPayload.orderId },
//           { transactionId: webhookPayload.orderNo },
//         ],
//         relations: ["vendor", "order", "vendor.beneficiary"],
//       });

//       if (!vendorPayout) {
//         this.logger.warn(
//           `Vendor payout not found for orderId: ${webhookPayload.orderId} or orderNo: ${webhookPayload.orderNo}`,
//         );
//         throw new NotFoundException(
//           `Vendor payout not found for orderId: ${webhookPayload.orderId}`,
//         );
//       }

//       // Validate currency matches
//       if (
//         webhookPayload.currency &&
//         webhookPayload.currency !== vendorPayout.currency
//       ) {
//         const errorMsg = `Currency mismatch: expected ${vendorPayout.currency}, received ${webhookPayload.currency}`;
//         this.logger.error(errorMsg, {
//           vendorPayoutId: vendorPayout.id,
//           orderId: webhookPayload.orderId,
//           expectedCurrency: vendorPayout.currency,
//           receivedCurrency: webhookPayload.currency,
//         });
//         throw new BadRequestException(errorMsg);
//       }

//       // Validate amount matches (convert from cents)
//       const expectedAmountInCents = Math.round(vendorPayout.amount * 100);
//       if (webhookPayload.amount !== expectedAmountInCents) {
//         const errorMsg = `Payout amount mismatch: expected ${vendorPayout.amount} ${vendorPayout.currency} (${expectedAmountInCents} cents), received ${webhookPayload.amount / 100} ${webhookPayload.currency || vendorPayout.currency} (${webhookPayload.amount} cents)`;
//         this.logger.error(errorMsg, {
//           vendorPayoutId: vendorPayout.id,
//           orderId: webhookPayload.orderId,
//           expectedAmount: vendorPayout.amount,
//           expectedAmountInCents,
//           receivedAmountInCents: webhookPayload.amount,
//           receivedAmount: webhookPayload.amount / 100,
//           currency: vendorPayout.currency,
//         });
//         throw new BadRequestException(errorMsg);
//       }

//       // Check for duplicate webhook processing (idempotency)
//       const mappedStatus = this.mapPalmpayStatusToVendorPayoutStatus(
//         webhookPayload.orderStatus,
//       );
//       if (
//         vendorPayout.transactionId === webhookPayload.orderNo &&
//         vendorPayout.status === mappedStatus
//       ) {
//         return {
//           success: true,
//           message: "Webhook already processed (idempotent)",
//         };
//       }

//       // Update vendor payout status
//       vendorPayout.transactionId = webhookPayload.orderNo;
//       vendorPayout.status = mappedStatus;

//       // Update processedAt if payout is completed
//       if (webhookPayload.orderStatus === 2) {
//         vendorPayout.processedAt = new Date();
//       }

//       // Store fee information if provided (in metadata since we don't deduct fees)
//       if (webhookPayload.fee) {
//         vendorPayout.metadata = {
//           ...(vendorPayout.metadata || {}),
//           payoutFee: webhookPayload.fee.fee / 100, // Convert from cents
//           payoutVat: webhookPayload.fee.vat
//             ? webhookPayload.fee.vat / 100
//             : undefined,
//         };
//       }

//       // Save vendor payout updates within transaction
//       const queryRunner = this.dataSource.createQueryRunner();
//       await queryRunner.connect();
//       await queryRunner.startTransaction();

//       try {
//         await queryRunner.manager.save(VendorPayout, vendorPayout);
//         await queryRunner.commitTransaction();
//       } catch (transactionError) {
//         await queryRunner.rollbackTransaction();
//         this.logger.error(
//           `Transaction rolled back for vendor payout webhook processing - payout ${vendorPayout.id}: ${transactionError.message}`,
//         );
//         throw transactionError;
//       } finally {
//         await queryRunner.release();
//       }

//       return {
//         success: true,
//         message: "Vendor payout webhook processed successfully",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay vendor payout webhook handling failed", {
//         error: error.message,
//         orderId: webhookPayload?.orderId,
//       });
//       throw error;
//     }
//   }

//   /**
//    * Map Palmpay order status to refund status
//    */
//   private mapPalmpayStatusToRefundStatus(
//     palmpayStatus: number,
//   ): RefundPaymentStatus {
//     const statusMap: Record<number, RefundPaymentStatus> = {
//       0: RefundPaymentStatus.PENDING, // unpaid - intermediate status
//       1: RefundPaymentStatus.PROCESSING, // paying - intermediate status
//       2: RefundPaymentStatus.COMPLETED, // success - final status
//       3: RefundPaymentStatus.FAILED, // fail - final status
//       4: RefundPaymentStatus.CANCELLED, // close - final status
//     };

//     return statusMap[palmpayStatus] || RefundPaymentStatus.PENDING;
//   }

//   /**
//    * Map Palmpay order status to vendor payout status
//    */
//   private mapPalmpayStatusToVendorPayoutStatus(
//     palmpayStatus: number,
//   ): VendorPayoutStatus {
//     const statusMap: Record<number, VendorPayoutStatus> = {
//       0: VendorPayoutStatus.PENDING, // unpaid - intermediate status
//       1: VendorPayoutStatus.PROCESSING, // paying - intermediate status
//       2: VendorPayoutStatus.COMPLETED, // success - final status
//       3: VendorPayoutStatus.FAILED, // fail - final status
//       4: VendorPayoutStatus.CANCELLED, // close - final status
//     };

//     return statusMap[palmpayStatus] || VendorPayoutStatus.PENDING;
//   }

//   /**
//    * Generate nonce string (random string for request uniqueness)
//    */
//   private generateNonce(length = 32): string {
//     const chars =
//       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//     let result = "";
//     for (let i = 0; i < length; i++) {
//       result += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     return result;
//   }

//   /**
//    * Format phone number with country code for Ghana
//    * Ghana requires phone number in international format (e.g., 023301234567890)
//    */
//   private formatPhoneNumber(phoneNumber: string, currency: string): string {
//     if (currency !== "GHS") {
//       return phoneNumber; // Only Ghana requires special formatting
//     }

//     // Remove any non-numeric characters
//     const cleaned = phoneNumber.replace(/\D/g, "");

//     // If already starts with country code (233), return as is
//     if (cleaned.startsWith("233")) {
//       return cleaned;
//     }

//     // If starts with 0, replace with 233
//     if (cleaned.startsWith("0")) {
//       return "233" + cleaned.substring(1);
//     }

//     // Otherwise, assume it's already in correct format or add 233
//     return cleaned.startsWith("233") ? cleaned : "233" + cleaned;
//   }

//   /**
//    * Format private key with PEM headers if needed
//    */
//   private formatPrivateKey(key: string): string {
//     const PEM_BEGIN = "-----BEGIN PRIVATE KEY-----\n";
//     const PEM_END = "\n-----END PRIVATE KEY-----";

//     let formattedKey = key.trim();
//     if (!formattedKey.includes("BEGIN PRIVATE KEY")) {
//       formattedKey = PEM_BEGIN + formattedKey;
//     }
//     if (!formattedKey.includes("END PRIVATE KEY")) {
//       formattedKey = formattedKey + PEM_END;
//     }
//     return formattedKey;
//   }

//   /**
//    * Format public key with PEM headers if needed
//    */
//   private formatPublicKey(key: string): string {
//     const PEM_BEGIN = "-----BEGIN PUBLIC KEY-----\n";
//     const PEM_END = "\n-----END PUBLIC KEY-----";

//     let formattedKey = key.trim();
//     if (!formattedKey.includes("BEGIN PUBLIC KEY")) {
//       formattedKey = PEM_BEGIN + formattedKey;
//     }
//     if (!formattedKey.includes("END PUBLIC KEY")) {
//       formattedKey = formattedKey + PEM_END;
//     }
//     return formattedKey;
//   }

//   /**
//    * Verify webhook signature
//    */
//   private verifyWebhookSignature(
//     payload: PalmpayPayoutWebhookPayload,
//     signature: string,
//   ): boolean {
//     if (!this.publicKey) {
//       this.logger.warn(
//         "PALMPAY_PUBLIC_KEY not configured, skipping signature verification",
//       );
//       return true; // Skip verification if public key not configured
//     }

//     try {
//       // URL decode the signature
//       const decodedSignature = decodeURIComponent(signature);

//       // Build canonical string from non-null parameter values
//       const queryString = Object.entries(payload)
//         .filter(
//           ([key, value]) =>
//             key !== "sign" &&
//             value !== undefined &&
//             value !== null &&
//             String(value).trim() !== "",
//         )
//         .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
//         .map(([key, value]) => {
//           // Handle nested objects (like fee)
//           if (typeof value === "object" && value !== null) {
//             return `${key}=${JSON.stringify(value)}`;
//           }
//           return `${key}=${String(value)}`;
//         })
//         .join("&");

//       // MD5 of query string, then RSA-SHA1 signature
//       const md5Str = crypto
//         .createHash("md5")
//         .update(queryString)
//         .digest("hex")
//         .toUpperCase()
//         .trim();

//       // Verify signature using public key
//       const formattedPublicKey = this.formatPublicKey(this.publicKey);
//       const verifier = crypto.createVerify("RSA-SHA1");
//       verifier.update(md5Str);
//       verifier.end();

//       const isValid = verifier.verify(
//         formattedPublicKey,
//         decodedSignature,
//         "base64",
//       );

//       if (!isValid) {
//         this.logger.error("Webhook signature verification failed");
//       }

//       return isValid;
//     } catch (error) {
//       this.logger.error(`Failed to verify webhook signature: ${error.message}`);
//       return false;
//     }
//   }

//   /**
//    * Make API request to Palmpay
//    * Uses the same signature generation pattern as pay-in
//    * @param endpoint API endpoint
//    * @param data Request data
//    * @param countryCode Optional country code override (defaults to currency-based)
//    */
//   private async makeApiRequest(
//     endpoint: string,
//     data: any = {},
//     countryCode?: string,
//   ): Promise<{
//     success: boolean;
//     data?: any;
//     message?: string;
//     error?: string;
//   }> {
//     try {
//       // Step 1: Convert body to query string (sorted by keys)
//       const queryString = Object.entries(data)
//         .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
//         .map(([key, value]) => `${key}=${String(value)}`)
//         .join("&");

//       // Step 2: MD5(queryString).toUpperCase()
//       const md5Str = crypto
//         .createHash("md5")
//         .update(queryString)
//         .digest("hex")
//         .toUpperCase()
//         .trim();

//       // Step 3: RSA-SHA1 signature with private key, base64 encoded
//       const formattedPrivateKey = this.formatPrivateKey(this.privateKey);
//       const signer = crypto.createSign("RSA-SHA1");
//       signer.update(md5Str);
//       signer.end();
//       const signature = signer.sign(formattedPrivateKey, "base64");

//       // Extract country code from currency or use provided override
//       let finalCountryCode: string;
//       if (countryCode) {
//         finalCountryCode = countryCode;
//       } else {
//         const countryCodeMap: Record<string, string> = {
//           GHS: "GH",
//           NGN: "NG",
//           KES: "KE",
//           TZS: "TZ",
//         };
//         finalCountryCode = countryCodeMap[data.currency?.toUpperCase()] || "GH";
//       }

//       const config = {
//         headers: {
//           Accept: "application/json",
//           "Content-Type": "application/json",
//           CountryCode: finalCountryCode,
//           Authorization: `Bearer ${this.appId}`,
//           Signature: signature,
//         },
//         timeout: 30000, // 30 seconds timeout
//       };

//       const response: AxiosResponse = await axios.post(
//         `${this.baseUrl}${endpoint}`,
//         data,
//         config,
//       );

//       // Check if Palmpay returned an error in the response body (even with HTTP 200)
//       if (
//         response.data?.respCode &&
//         response.data.respCode !== "00000" &&
//         response.data.respCode !== "00000000"
//       ) {
//         return {
//           success: false,
//           data: response.data,
//           message: response.data?.respMsg || "Palmpay API error",
//           error: response.data?.respCode || "Unknown error",
//         };
//       }

//       return {
//         success: true,
//         data: response.data,
//         message: "Request successful",
//       };
//     } catch (error) {
//       this.logger.error("Palmpay API request failed", {
//         error: error.message,
//       });

//       if (error.response) {
//         this.logger.error("Palmpay API error response", {
//           status: error.response.status,
//         });
//         return {
//           success: false,
//           message: error.response.data?.message || "API request failed",
//           error: error.response.data?.error || error.message,
//         };
//       } else if (error.request) {
//         this.logger.error("Palmpay API network error");
//         return {
//           success: false,
//           message: "Network error - unable to reach Palmpay API",
//           error: error.message,
//         };
//       } else {
//         return {
//           success: false,
//           message: "Request configuration error",
//           error: error.message,
//         };
//       }
//     }
//   }
// }
