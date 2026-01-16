// import { Injectable, Logger, BadRequestException } from "@nestjs/common";
// import { PaymentResponse } from "../../orders/gateways/payment-gateway-base";
// import * as crypto from "crypto";

// /**
//  * Service for validating and sanitizing payment gateway responses
//  * Ensures data integrity and prevents malicious response corruption
//  */
// @Injectable()
// export class PaymentResponseValidatorService {
//   private readonly logger = new Logger(PaymentResponseValidatorService.name);

//   /**
//    * Validates and sanitizes a payment gateway response
//    */
//   validatePaymentResponse(
//     response: any,
//     gatewayId: string,
//     expectedTransactionId?: string
//   ): PaymentResponse {
//     this.logger.log(`Validating payment response from gateway: ${gatewayId}`);

//     // 1. Basic structure validation
//     const validatedResponse = this.validateResponseStructure(
//       response,
//       gatewayId
//     );

//     // 2. Transaction ID validation
//     this.validateTransactionId(
//       validatedResponse.transactionId,
//       expectedTransactionId
//     );

//     // 3. Sanitize sensitive data
//     const sanitizedResponse = this.sanitizeResponseData(validatedResponse);

//     // 4. Validate response integrity
//     this.validateResponseIntegrity(sanitizedResponse, gatewayId);

//     this.logger.log(
//       `Payment response validation completed for gateway: ${gatewayId}`
//     );
//     return sanitizedResponse;
//   }

//   /**
//    * Validates the basic structure of the payment response
//    */
//   private validateResponseStructure(
//     response: any,
//     gatewayId: string
//   ): PaymentResponse {
//     if (!response || typeof response !== "object") {
//       throw new BadRequestException(
//         `Invalid response structure from gateway: ${gatewayId}`
//       );
//     }

//     // Required fields validation
//     const requiredFields = ["success", "transactionId", "status"];
//     for (const field of requiredFields) {
//       if (!(field in response)) {
//         throw new BadRequestException(
//           `Missing required field '${field}' in response from gateway: ${gatewayId}`
//         );
//       }
//     }

//     // Type validation
//     if (typeof response.success !== "boolean") {
//       throw new BadRequestException(
//         `Invalid 'success' field type from gateway: ${gatewayId}. Expected boolean, got ${typeof response.success}`
//       );
//     }

//     if (
//       typeof response.transactionId !== "string" ||
//       response.transactionId.trim() === ""
//     ) {
//       throw new BadRequestException(
//         `Invalid 'transactionId' field from gateway: ${gatewayId}. Expected non-empty string`
//       );
//     }

//     if (typeof response.status !== "string" || response.status.trim() === "") {
//       throw new BadRequestException(
//         `Invalid 'status' field from gateway: ${gatewayId}. Expected non-empty string`
//       );
//     }

//     // Optional fields type validation
//     if (
//       response.reference !== undefined &&
//       typeof response.reference !== "string"
//     ) {
//       throw new BadRequestException(
//         `Invalid 'reference' field type from gateway: ${gatewayId}. Expected string, got ${typeof response.reference}`
//       );
//     }

//     if (
//       response.checkoutUrl !== undefined &&
//       typeof response.checkoutUrl !== "string"
//     ) {
//       throw new BadRequestException(
//         `Invalid 'checkoutUrl' field type from gateway: ${gatewayId}. Expected string, got ${typeof response.checkoutUrl}`
//       );
//     }

//     if (
//       response.message !== undefined &&
//       typeof response.message !== "string"
//     ) {
//       throw new BadRequestException(
//         `Invalid 'message' field type from gateway: ${gatewayId}. Expected string, got ${typeof response.message}`
//       );
//     }

//     if (response.errors !== undefined && !Array.isArray(response.errors)) {
//       throw new BadRequestException(
//         `Invalid 'errors' field type from gateway: ${gatewayId}. Expected array, got ${typeof response.errors}`
//       );
//     }

//     if (response.data !== undefined && typeof response.data !== "object") {
//       throw new BadRequestException(
//         `Invalid 'data' field type from gateway: ${gatewayId}. Expected object, got ${typeof response.data}`
//       );
//     }

//     return response as PaymentResponse;
//   }

//   /**
//    * Validates transaction ID format and consistency
//    */
//   private validateTransactionId(
//     transactionId: string,
//     expectedTransactionId?: string
//   ): void {
//     // Basic format validation
//     if (!/^[a-zA-Z0-9\-_]+$/.test(transactionId)) {
//       throw new BadRequestException(
//         `Invalid transaction ID format: ${transactionId}. Only alphanumeric characters, hyphens, and underscores are allowed`
//       );
//     }

//     // Length validation (reasonable limits)
//     if (transactionId.length < 3 || transactionId.length > 100) {
//       throw new BadRequestException(
//         `Invalid transaction ID length: ${transactionId}. Length must be between 3 and 100 characters`
//       );
//     }

//     // Consistency check if expected transaction ID is provided
//     if (expectedTransactionId && transactionId !== expectedTransactionId) {
//       this.logger.warn(
//         `Transaction ID mismatch: expected ${expectedTransactionId}, got ${transactionId}`
//       );
//       // Note: We don't throw an error here as the gateway might return a different ID
//       // This is logged for monitoring purposes
//     }
//   }

//   /**
//    * Sanitizes sensitive data in the response
//    */
//   private sanitizeResponseData(response: PaymentResponse): PaymentResponse {
//     const sanitized = { ...response };

//     // Sanitize transaction ID (remove any potential XSS)
//     sanitized.transactionId = this.sanitizeString(sanitized.transactionId);

//     // Sanitize reference
//     if (sanitized.reference) {
//       sanitized.reference = this.sanitizeString(sanitized.reference);
//     }

//     // Sanitize checkout URL
//     if (sanitized.checkoutUrl) {
//       sanitized.checkoutUrl = this.sanitizeUrl(sanitized.checkoutUrl);
//     }

//     // Sanitize message
//     if (sanitized.message) {
//       sanitized.message = this.sanitizeString(sanitized.message);
//     }

//     // Sanitize errors array
//     if (sanitized.errors) {
//       sanitized.errors = sanitized.errors.map((error) =>
//         this.sanitizeString(error)
//       );
//     }

//     // Sanitize data object
//     if (sanitized.data) {
//       sanitized.data = this.sanitizeDataObject(sanitized.data);
//     }

//     return sanitized;
//   }

//   /**
//    * Sanitizes a string to prevent XSS and other attacks
//    */
//   private sanitizeString(input: string): string {
//     if (typeof input !== "string") return input;

//     return input
//       .replace(/[<>]/g, "") // Remove potential HTML tags
//       .replace(/javascript:/gi, "") // Remove javascript: protocol
//       .replace(/on\w+\s*=/gi, "") // Remove event handlers
//       .trim();
//   }

//   /**
//    * Sanitizes a URL to ensure it's safe
//    */
//   private sanitizeUrl(url: string): string {
//     if (typeof url !== "string") return url;

//     try {
//       const urlObj = new URL(url);

//       // Only allow https and http protocols
//       if (!["https:", "http:"].includes(urlObj.protocol)) {
//         throw new Error("Invalid protocol");
//       }

//       return urlObj.toString();
//     } catch (error) {
//       this.logger.warn(`Invalid URL format: ${url}`);
//       return ""; // Return empty string for invalid URLs
//     }
//   }

//   /**
//    * Sanitizes data object recursively
//    */
//   private sanitizeDataObject(data: Record<string, any>): Record<string, any> {
//     const sanitized: Record<string, any> = {};

//     for (const [key, value] of Object.entries(data)) {
//       if (typeof value === "string") {
//         sanitized[key] = this.sanitizeString(value);
//       } else if (
//         typeof value === "object" &&
//         value !== null &&
//         !Array.isArray(value)
//       ) {
//         sanitized[key] = this.sanitizeDataObject(value);
//       } else if (Array.isArray(value)) {
//         sanitized[key] = value.map((item) =>
//           typeof item === "string" ? this.sanitizeString(item) : item
//         );
//       } else {
//         sanitized[key] = value;
//       }
//     }

//     return sanitized;
//   }

//   /**
//    * Validates response integrity (basic checks)
//    */
//   private validateResponseIntegrity(
//     response: PaymentResponse,
//     gatewayId: string
//   ): void {
//     // Check for logical consistency
//     if (response.success && response.errors && response.errors.length > 0) {
//       this.logger.warn(
//         `Inconsistent response from gateway ${gatewayId}: success=true but errors present`
//       );
//     }

//     if (
//       !response.success &&
//       (!response.errors || response.errors.length === 0)
//     ) {
//       this.logger.warn(
//         `Inconsistent response from gateway ${gatewayId}: success=false but no errors provided`
//       );
//     }

//     // Validate status values
//     const validStatuses = [
//       "pending",
//       "completed",
//       "failed",
//       "cancelled",
//       "initiated",
//       "processing",
//     ];
//     if (!validStatuses.includes(response.status.toLowerCase())) {
//       this.logger.warn(
//         `Unknown status '${response.status}' from gateway ${gatewayId}`
//       );
//     }

//     // Validate data object structure if present
//     if (response.data) {
//       this.validateDataObjectStructure(response.data, gatewayId);
//     }
//   }

//   /**
//    * Validates the structure of the data object
//    */
//   private validateDataObjectStructure(
//     data: Record<string, any>,
//     gatewayId: string
//   ): void {
//     // Check for suspicious patterns
//     const suspiciousKeys = [
//       "eval",
//       "function",
//       "script",
//       "javascript",
//       "vbscript",
//     ];
//     const dataString = JSON.stringify(data).toLowerCase();

//     for (const suspiciousKey of suspiciousKeys) {
//       if (dataString.includes(suspiciousKey)) {
//         this.logger.warn(
//           `Suspicious content detected in response data from gateway ${gatewayId}: ${suspiciousKey}`
//         );
//       }
//     }

//     // Check for excessive nesting (potential DoS)
//     const nestingLevel = this.calculateNestingLevel(data);
//     if (nestingLevel > 10) {
//       this.logger.warn(
//         `Excessive nesting level (${nestingLevel}) in response data from gateway ${gatewayId}`
//       );
//     }

//     // Check for excessive size
//     const dataSize = JSON.stringify(data).length;
//     if (dataSize > 100000) {
//       // 100KB limit
//       this.logger.warn(
//         `Large response data size (${dataSize} bytes) from gateway ${gatewayId}`
//       );
//     }
//   }

//   /**
//    * Calculates nesting level of an object
//    */
//   private calculateNestingLevel(obj: any, currentLevel = 0): number {
//     if (typeof obj !== "object" || obj === null) {
//       return currentLevel;
//     }

//     let maxLevel = currentLevel;
//     for (const value of Object.values(obj)) {
//       const level = this.calculateNestingLevel(value, currentLevel + 1);
//       maxLevel = Math.max(maxLevel, level);
//     }

//     return maxLevel;
//   }

//   /**
//    * Encrypts sensitive payment response data for storage
//    */
//   encryptResponseData(response: PaymentResponse): string {
//     try {
//       // Use a simple encryption for sensitive data
//       // In production, use proper encryption keys from environment
//       const encryptionKey =
//         process.env.PAYMENT_RESPONSE_ENCRYPTION_KEY ||
//         "default-key-change-in-production";

//       const dataToEncrypt = {
//         transactionId: response.transactionId,
//         reference: response.reference,
//         checkoutUrl: response.checkoutUrl,
//         data: response.data,
//       };

//       const iv = crypto.randomBytes(16);
//       const cipher = crypto.createCipheriv(
//         "aes-256-cbc",
//         Buffer.from(encryptionKey.padEnd(32, "0").slice(0, 32)),
//         iv
//       );
//       let encrypted = cipher.update(
//         JSON.stringify(dataToEncrypt),
//         "utf8",
//         "hex"
//       );
//       encrypted += cipher.final("hex");
//       encrypted = iv.toString("hex") + ":" + encrypted;

//       return encrypted;
//     } catch (error) {
//       this.logger.error(`Failed to encrypt response data: ${error.message}`);
//       return JSON.stringify(response); // Fallback to unencrypted
//     }
//   }

//   /**
//    * Decrypts sensitive payment response data from storage
//    */
//   decryptResponseData(encryptedData: string): any {
//     try {
//       const encryptionKey =
//         process.env.PAYMENT_RESPONSE_ENCRYPTION_KEY ||
//         "default-key-change-in-production";

//       const [ivHex, encrypted] = encryptedData.split(":");
//       const iv = Buffer.from(ivHex, "hex");
//       const decipher = crypto.createDecipheriv(
//         "aes-256-cbc",
//         Buffer.from(encryptionKey.padEnd(32, "0").slice(0, 32)),
//         iv
//       );
//       let decrypted = decipher.update(encrypted, "hex", "utf8");
//       decrypted += decipher.final("utf8");

//       return JSON.parse(decrypted);
//     } catch (error) {
//       this.logger.error(`Failed to decrypt response data: ${error.message}`);
//       return null;
//     }
//   }
// }
