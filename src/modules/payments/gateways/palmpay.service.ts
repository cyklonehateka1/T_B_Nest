import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import axios, { AxiosResponse } from "axios";
import * as crypto from "crypto";
import {
  PaymentGatewayBase,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusRequest,
  PaymentStatusResponse,
  WebhookRequest,
  WebhookResponse,
} from "./payment-gateway-base";
import {
  MobileMoneyPaymentData,
  isMobileMoneyPaymentData,
} from "../order-creation.service";
import { PaymentResponseValidatorService } from "../../common/services/payment-response-validator.service";
import { EmailService } from "../../email/email.service";
import { WebhookService } from "../../common/services/webhook.service";
import { Payment } from "../../common/entities/payment.entity";
import { Order } from "../../common/entities/order.entity";
import { OrderService } from "../orders.service";
export interface PalmpayCreateOrderRequest {
  requestTime: number;
  version: string;
  nonceStr: string;
  orderId: string;
  amount: number;
  currency: string;
  notifyUrl: string;
  callBackUrl: string;
  productType: string;
  accessMode?: string;
  title?: string;
  description?: string;
  userId?: string;
  goodsDetails?: string;
  splitDetail?: string;
}
export interface PalmpayCreateOrderResponse {
  orderNo?: string;
  orderStatus?: number;
  message?: string;
  checkoutUrl?: string;
  currency?: string;
  orderAmount?: number;
  respCode?: string;
  respMsg?: string;
}
export interface PalmpayApiResponse {
  success?: boolean;
  data?: PalmpayCreateOrderResponse | PalmpayQueryStatusResponse;
  message?: string;
  error?: string;
}
export interface PalmpayMobileMoneyWebhookPayload {
  orderId: string;
  orderNo: string;
  appId: string;
  transType: string;
  orderType: string;
  amount: number;
  couponAmount: number;
  status: number;
  completeTime?: number;
  payerMobileNo?: string;
  payerWalletChannel?: string;
  payMethod?: string;
  orderStatus: number;
  currency: string;
  tntCode?: string;
  sign: string;
}
export interface PalmpayVirtualAccountWebhookPayload {
  orderNo: string;
  orderStatus: number;
  createdTime: number;
  updateTime: number;
  currency: string;
  orderAmount: number;
  reference?: string;
  payerAccountNo: string;
  payerAccountName: string;
  payerBankName: string;
  virtualAccountNo?: string;
  virtualAccountName?: string;
  accountReference?: string;
  sessionId?: string;
  sign?: string;
}
export interface PalmpayQueryStatusRequest {
  requestTime: number;
  version: string;
  nonceStr: string;
  orderId: string;
  orderNo: string;
}
export interface PalmpayQueryStatusResponse {
  country?: string;
  amount?: number;
  orderNo?: string;
  orderId?: string;
  orderExpireMilliSec?: number;
  orderStatus?: number;
  remark?: string;
  transType?: string;
  merchantId?: string;
  appId?: string;
  createdTime?: number;
  currency?: string;
  productType?: string;
  completedTime?: number;
  payerBankName?: string;
  payerAccountName?: string;
  payerVirtualAccNo?: string;
}
export interface PalmpayQueryStatusApiResponse {
  data: PalmpayQueryStatusResponse;
  respMsg: string;
  respCode: string;
}
@Injectable()
export class PalmpayService extends PaymentGatewayBase {
  protected readonly logger = new Logger(PalmpayService.name);
  private readonly appId: string;
  private readonly baseUrl: string;
  private readonly privateKey: string;
  private readonly publicKey?: string;
  private readonly frontendBaseUrl: string;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderService: OrderService,
    private readonly paymentResponseValidatorService: PaymentResponseValidatorService,
    private readonly emailService: EmailService,
    private readonly webhookService: WebhookService,
    private readonly dataSource: DataSource,
  ) {
    super(new Logger(PalmpayService.name));
    const appId = this.configService.get<string>("PALMPAY_APP_ID");
    if (!appId) {
      throw new Error("PALMPAY_APP_ID is not configured");
    }
    this.appId = appId;
    const baseUrl = this.configService.get<string>("PALMPAY_BASE_URL");
    if (!baseUrl) {
      throw new Error("PALMPAY_BASE_URL is not configured");
    }
    this.baseUrl = baseUrl;
    const privateKey = this.configService.get<string>("PALMPAY_PRIVATE_KEY");
    if (!privateKey) {
      throw new Error("PALMPAY_PRIVATE_KEY is not configured");
    }
    this.privateKey = privateKey;
    const frontendBaseUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      this.configService.get<string>("FRONTEND_BASE_URL");
    if (!frontendBaseUrl) {
      throw new Error("FRONTEND_URL or FRONTEND_BASE_URL is not configured");
    }
    this.frontendBaseUrl = frontendBaseUrl;
    this.publicKey =
      this.configService.get<string>("PALMPAY_PUBLIC_KEY") || undefined;
  }
  getGatewayId(): string {
    return "palmpay";
  }
  getGatewayName(): string {
    return "Palmpay";
  }
  getSupportedPaymentMethods(): string[] {
    return ["mobile_money"];
  }
  getSupportedCurrencies(): string[] {
    return ["GHS", "TZS", "KES"];
  }
  validateConfiguration(): boolean {
    return Boolean(
      this.appId &&
        this.appId.length > 0 &&
        this.baseUrl &&
        this.privateKey &&
        this.privateKey.length > 0,
    );
  }
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (request.paymentMethod === "mobile_money") {
        return await this.initiateMobileMoneyPayment(request);
      } else {
        throw new BadRequestException(
          `Unsupported payment method: ${request.paymentMethod}. Palmpay only supports mobile_money`,
        );
      }
    } catch (error) {
      this.logger.error(`Palmpay payment initiation failed: ${error.message}`);
      return {
        success: false,
        transactionId: "",
        reference: "",
        status: "failed",
        message: error.message,
        errors: [error.message],
      };
    }
  }
  async checkPaymentStatus(
    request: PaymentStatusRequest,
  ): Promise<PaymentStatusResponse> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { providerTransactionId: request.transactionId },
        relations: ["order"],
      });
      if (!payment) {
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: "Payment not found",
          errors: ["Payment not found"],
        };
      }
      if (!payment.order) {
        this.logger.error(`Order not found for payment ${payment.id}`);
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: "Order not found for payment",
          errors: ["Order not found"],
        };
      }
      const generateNonce = (length = 32): string => {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      const queryStatusRequest: PalmpayQueryStatusRequest & {
        currency?: string;
      } = {
        requestTime: Date.now(),
        version: "V1.1",
        nonceStr: generateNonce(),
        orderId: payment.order.orderNumber,
        orderNo: request.transactionId,
        currency: payment.currency,
      };
      const response = await this.makeApiRequest(
        "/api/v2/payment/merchant/order/queryStatus",
        queryStatusRequest,
        "POST",
      );
      if (!response.success) {
        const errorMsg = response.message || "Palmpay status check failed";
        this.logger.error("Palmpay status check API request failed", {
          transactionId: request.transactionId,
        });
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: errorMsg,
          errors: [response.error || errorMsg],
        };
      }
      const apiResponse: PalmpayQueryStatusApiResponse = response.data as any;
      if (!apiResponse) {
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: "Empty response from Palmpay API",
          errors: ["Empty response"],
        };
      }
      const respCode = apiResponse.respCode;
      if (respCode && respCode !== "00000" && respCode !== "00000000") {
        const errorMsg =
          apiResponse.respMsg || `Palmpay API error: ${respCode}`;
        this.logger.error("Palmpay status check returned an error", {
          transactionId: request.transactionId,
          respCode,
        });
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: errorMsg,
          errors: [respCode],
        };
      }
      const statusData: PalmpayQueryStatusResponse = apiResponse.data;
      if (!statusData) {
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: "Empty data in Palmpay API response",
          errors: ["Empty data"],
        };
      }
      const mappedStatus =
        statusData.orderStatus !== undefined
          ? this.mapPalmpayStatus(statusData.orderStatus)
          : (payment.status as string);
      const amount =
        statusData.amount !== undefined
          ? statusData.amount / 100
          : Number(payment.amount);
      return {
        success: true,
        status: mappedStatus,
        transactionId: statusData.orderNo || request.transactionId,
        amount,
        currency: statusData.currency || payment.currency,
        message:
          statusData.remark ||
          apiResponse.respMsg ||
          "Payment status retrieved successfully",
        data: {
          country: statusData.country,
          orderId: statusData.orderId,
          orderNo: statusData.orderNo,
          merchantId: statusData.merchantId,
          appId: statusData.appId,
          orderStatus: statusData.orderStatus,
          orderExpireMilliSec: statusData.orderExpireMilliSec,
          remark: statusData.remark,
          transType: statusData.transType,
          createdTime: statusData.createdTime,
          completedTime: statusData.completedTime,
          productType: statusData.productType,
          payerBankName: statusData.payerBankName,
          payerAccountName: statusData.payerAccountName,
          payerVirtualAccNo: statusData.payerVirtualAccNo,
          respCode: apiResponse.respCode,
          respMsg: apiResponse.respMsg,
        },
      };
    } catch (error) {
      this.logger.error(`Palmpay status check failed: ${error.message}`);
      return {
        success: false,
        status: "error",
        transactionId: request.transactionId,
        message: error.message,
        errors: [error.message],
      };
    }
  }
  private mapPalmpayStatus(palmpayStatus: number): string {
    const statusMap: Record<number, string> = {
      0: "pending",
      1: "pending",
      2: "completed",
      3: "failed",
      4: "cancelled",
    };
    return statusMap[palmpayStatus] || "pending";
  }
  private isProduction(): boolean {
    return this.configService.get<string>("NODE_ENV") === "production";
  }
  private isValidStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ["pending", "completed", "failed", "cancelled"],
      completed: ["completed"],
      failed: ["failed"],
      cancelled: ["cancelled"],
    };
    const allowedStatuses = validTransitions[currentStatus] || [];
    return allowedStatuses.includes(newStatus);
  }
  private calculateWebhookHash(
    webhookPayload: PalmpayMobileMoneyWebhookPayload,
  ): string {
    const dataToHash = [
      webhookPayload.orderNo,
      webhookPayload.orderStatus,
      webhookPayload.amount,
      webhookPayload.completeTime || "",
      webhookPayload.status,
    ].join("|");
    return crypto.createHash("sha256").update(dataToHash).digest("hex");
  }
  private validateWebhookTimestamp(
    completeTime?: number,
    createdAt?: Date,
  ): void {
    if (!completeTime) {
      return;
    }
    const webhookTime = new Date(completeTime);
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000;
    const age = now.getTime() - webhookTime.getTime();
    if (age > maxAge) {
      throw new BadRequestException(
        `Webhook timestamp is too old (${Math.round(age / (60 * 60 * 1000))} hours). Rejecting potential replay attack.`,
      );
    }
    if (createdAt && webhookTime.getTime() < createdAt.getTime()) {
      this.logger.warn(
        `Webhook completeTime (${webhookTime.toISOString()}) is before payment creation (${createdAt.toISOString()})`,
      );
    }
  }
  async handleWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      const webhookPayload: PalmpayMobileMoneyWebhookPayload = request.body;
      if (!webhookPayload) {
        throw new BadRequestException("Invalid webhook payload: empty body");
      }
      if (!webhookPayload.orderId) {
        throw new BadRequestException(
          "Invalid webhook payload: missing orderId",
        );
      }
      if (!webhookPayload.orderNo) {
        throw new BadRequestException(
          "Invalid webhook payload: missing orderNo",
        );
      }
      if (webhookPayload.orderStatus === undefined) {
        throw new BadRequestException(
          "Invalid webhook payload: missing orderStatus",
        );
      }
      if (webhookPayload.sign) {
        const isValid = this.verifyWebhookSignature(
          webhookPayload,
          webhookPayload.sign,
        );
        if (!isValid) {
          const errorMsg = "Palmpay webhook signature verification failed";
          this.logger.error(errorMsg, {
            orderId: webhookPayload.orderId,
            orderNo: webhookPayload.orderNo,
          });
          if (this.isProduction()) {
            throw new BadRequestException(
              `${errorMsg}. Webhook rejected for security reasons.`,
            );
          }
        }
      } else {
        const warningMsg =
          "Palmpay webhook missing signature - cannot verify authenticity";
        this.logger.warn(warningMsg);
        if (this.isProduction() && this.publicKey) {
          throw new BadRequestException(
            `${warningMsg}. Webhook rejected in production when public key is configured.`,
          );
        }
      }
      const orderId = webhookPayload.orderId;
      let payment = await this.paymentRepository.findOne({
        where: { orderNumber: orderId },
        relations: ["order", "order.orderItems"],
      });
      if (!payment && webhookPayload.orderNo) {
        const paymentByProviderId = await this.paymentRepository.findOne({
          where: { providerTransactionId: webhookPayload.orderNo },
          relations: ["order", "order.orderItems"],
        });
        if (paymentByProviderId) {
          payment = paymentByProviderId;
          if (!payment.providerTransactionId) {
            payment.providerTransactionId = webhookPayload.orderNo;
          }
        }
      }
      if (!payment) {
        this.logger.warn(
          `Payment not found for orderId: ${webhookPayload.orderId} or orderNo: ${webhookPayload.orderNo}`,
        );
        throw new NotFoundException(
          `Payment not found for orderId: ${webhookPayload.orderId}`,
        );
      }
      if (webhookPayload.appId && webhookPayload.appId !== this.appId) {
        const errorMsg = `Webhook appId mismatch: received ${webhookPayload.appId}, expected ${this.appId}`;
        this.logger.error(errorMsg);
        throw new BadRequestException(
          `${errorMsg}. Webhook rejected for security reasons.`,
        );
      }
      if (
        webhookPayload.currency &&
        webhookPayload.currency !== payment.currency
      ) {
        const errorMsg = `Currency mismatch: expected ${payment.currency}, received ${webhookPayload.currency}`;
        this.logger.error(errorMsg, {
          paymentId: payment.id,
          orderId: webhookPayload.orderId,
          expectedCurrency: payment.currency,
          receivedCurrency: webhookPayload.currency,
        });
        throw new BadRequestException(errorMsg);
      }
      const expectedAmountInCents = Math.round(payment.amount * 100);
      const receivedAmountInCents = webhookPayload.amount;
      if (receivedAmountInCents !== expectedAmountInCents) {
        const errorMsg = `Payment amount mismatch: expected ${payment.amount} ${payment.currency} (${expectedAmountInCents} cents), received ${receivedAmountInCents / 100} ${webhookPayload.currency || payment.currency} (${receivedAmountInCents} cents)`;
        this.logger.error(errorMsg, {
          paymentId: payment.id,
          orderId: webhookPayload.orderId,
          expectedAmount: payment.amount,
          expectedAmountInCents,
          receivedAmountInCents,
          receivedAmount: receivedAmountInCents / 100,
          currency: payment.currency,
        });
        throw new BadRequestException(errorMsg);
      }
      this.validateWebhookTimestamp(
        webhookPayload.completeTime,
        payment.createdAt,
      );
      const webhookHash = this.calculateWebhookHash(webhookPayload);
      const mappedStatus =
        webhookPayload.orderStatus !== undefined
          ? this.mapPalmpayStatus(webhookPayload.orderStatus)
          : null;
      const isDuplicate =
        webhookPayload.orderNo &&
        payment.providerTransactionId === webhookPayload.orderNo &&
        mappedStatus &&
        payment.providerStatus === mappedStatus &&
        payment.responseData?.webhookHash === webhookHash;
      if (isDuplicate) {
        return {
          success: true,
          status: "processed",
          message: "Webhook already processed (idempotent)",
          transactionId: webhookPayload.orderNo,
        };
      }
      if (webhookPayload.orderNo && !payment.providerTransactionId) {
        payment.providerTransactionId = webhookPayload.orderNo;
      }
      const validatedWebhookData =
        this.paymentResponseValidatorService.validatePaymentResponse(
          {
            success: true,
            transactionId:
              webhookPayload.orderNo ||
              payment.providerTransactionId ||
              payment.orderNumber,
            status: mappedStatus || (payment.status as string),
            message: `Payment status: ${this.mapPalmpayStatus(webhookPayload.orderStatus)} (Status: ${webhookPayload.status}, Order Status: ${webhookPayload.orderStatus})`,
            data: webhookPayload,
          },
          "palmpay",
          payment.providerTransactionId,
        );
      if (validatedWebhookData.transactionId) {
        payment.providerTransactionId = validatedWebhookData.transactionId;
      }
      if (mappedStatus) {
        payment.providerStatus = mappedStatus as any;
      }
      const encryptedWebhookData =
        this.paymentResponseValidatorService.encryptResponseData(
          validatedWebhookData,
        );
      payment.responseData = {
        success: validatedWebhookData.success,
        message: validatedWebhookData.message,
        data: validatedWebhookData.data,
        transactionId: validatedWebhookData.transactionId,
        encryptedData: encryptedWebhookData,
        webhookHash,
      };
      if (webhookPayload.orderStatus !== undefined) {
        const newStatus = this.mapPalmpayStatus(webhookPayload.orderStatus);
        const currentStatus = payment.status as string;
        if (!this.isValidStatusTransition(currentStatus, newStatus)) {
          const errorMsg = `Invalid status transition: cannot change payment status from "${currentStatus}" to "${newStatus}"`;
          this.logger.error(errorMsg, {
            paymentId: payment.id,
            orderId: webhookPayload.orderId,
            currentStatus,
            newStatus,
            palmpayOrderStatus: webhookPayload.orderStatus,
          });
          this.logger.warn(
            "Proceeding with status update despite invalid transition (allowing due to potential timing issues)",
          );
        }
        switch (newStatus) {
          case "pending":
            payment.status = "pending" as any;
            break;
          case "completed":
            payment.status = "completed" as any;
            break;
          case "failed":
            payment.status = "failed" as any;
            break;
          case "cancelled":
            payment.status = "cancelled" as any;
            break;
        }
      }
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.manager.save(Payment, payment);
        if (webhookPayload.orderStatus === 2) {
          payment.order.paidAmount = payment.amount;
          payment.order.paidAt = webhookPayload.completeTime
            ? new Date(webhookPayload.completeTime)
            : new Date();
          await queryRunner.manager.save(Order, payment.order);
        } else if (webhookPayload.orderStatus === 3) {
          payment.order.status = "failed" as any;
          await queryRunner.manager.save(Order, payment.order);
        } else if (webhookPayload.orderStatus === 4) {
          payment.order.status = "cancelled" as any;
          await queryRunner.manager.save(Order, payment.order);
        }
        await queryRunner.commitTransaction();
      } catch (transactionError) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `Transaction rolled back for webhook processing - payment ${payment.id}: ${transactionError.message}`,
        );
        throw transactionError;
      } finally {
        await queryRunner.release();
      }
      if (!payment.emailNotificationSent || !payment.webhookNotificationSent) {
        if (webhookPayload.orderStatus !== undefined) {
          await this.sendNotificationsForWebhook(
            payment,
            this.mapPalmpayStatus(webhookPayload.orderStatus),
          );
        }
      }
      return {
        success: true,
        status: "processed",
        message: "Webhook processed successfully",
        transactionId:
          webhookPayload.orderNo || payment.providerTransactionId || "",
      };
    } catch (error) {
      this.logger.error("Palmpay webhook handling failed", {
        error: error.message,
        orderId: request.body?.orderId,
      });
      return {
        success: false,
        status: "error",
        message: error.message || "Webhook processing failed",
        errors: [error.message],
      };
    }
  }
  private async initiateMobileMoneyPayment(
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    if (
      !request.additionalData ||
      !isMobileMoneyPaymentData(request.additionalData)
    ) {
      throw new BadRequestException(
        "Mobile money payment requires accountName, accountNumber, and network",
      );
    }
    const amountInCents = Math.round(request.amount * 100);
    const appUrl = this.configService.get<string>("ADMIN_API_BASEURL");
    if (!appUrl) {
      throw new Error("ADMIN_API_BASEURL environment variable is required");
    }
    const generateNonce = (length = 32): string => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const palmpayRequest: PalmpayCreateOrderRequest = {
      requestTime: Date.now(),
      version: "V1.1",
      nonceStr: generateNonce(),
      orderId: request.orderNumber,
      amount: amountInCents,
      currency: request.currency,
      notifyUrl: `${appUrl}/webhooks/palmpay/mobile-money`,
      callBackUrl: `${this.frontendBaseUrl}/orders`,
      productType: "mmo",
      accessMode: "redirect",
      title: `Payment for order ${request.orderNumber}`,
      description: `Payment for order ${request.orderNumber}`,
    };
    try {
      const response = await this.makeApiRequest(
        "/api/v2/payment/merchant/createorder",
        palmpayRequest,
      );
      if (!response.success) {
        const errorMsg = response.message || "Palmpay API request failed";
        this.logger.error("Palmpay API request failed:", {
          paymentId: request.paymentId,
          orderNumber: request.orderNumber,
          response,
        });
        throw new BadRequestException(errorMsg);
      }
      if (response.success && response.data) {
        const responseWrapper = response.data as any;
        const palmpayResponse: PalmpayCreateOrderResponse =
          responseWrapper.data || responseWrapper;
        const respCode = responseWrapper.respCode || palmpayResponse.respCode;
        if (respCode && respCode !== "00000" && respCode !== "00000000") {
          const errorMsg =
            responseWrapper.respMsg ||
            palmpayResponse.respMsg ||
            `Palmpay API error: ${respCode}`;
          this.logger.error("Palmpay API returned an error:", {
            paymentId: request.paymentId,
            orderNumber: request.orderNumber,
            respCode,
            respMsg: responseWrapper.respMsg || palmpayResponse.respMsg,
            fullResponse: responseWrapper,
          });
          throw new BadRequestException(errorMsg);
        }
        const orderNo = palmpayResponse?.orderNo
          ? String(palmpayResponse.orderNo).trim()
          : null;
        if (!orderNo || orderNo === "") {
          this.logger.error("Palmpay orderNo is missing or empty:", {
            paymentId: request.paymentId,
            orderNumber: request.orderNumber,
            rawResponse: response,
            palmpayResponse,
            orderNoField: palmpayResponse?.orderNo,
            orderNoType: typeof palmpayResponse?.orderNo,
          });
          throw new BadRequestException(
            "Palmpay API did not return a valid order number. Please check the API response structure.",
          );
        }
        return {
          success: true,
          transactionId: orderNo,
          reference: request.paymentReference,
          status: this.mapPalmpayStatus(palmpayResponse.orderStatus ?? 0),
          checkoutUrl: palmpayResponse.checkoutUrl || undefined,
          message:
            palmpayResponse.message ||
            "Mobile money payment initiated successfully",
          data: {
            paymentMethod: "mobile_money",
            amount: request.amount * 100,
            currency: request.currency,
            palmpayOrderNo: orderNo,
            palmpayOrderStatus: palmpayResponse.orderStatus,
            apiResponse: palmpayResponse,
          },
        };
      } else {
        this.logger.error("Palmpay API request failed:", {
          paymentId: request.paymentId,
          orderNumber: request.orderNumber,
          response,
        });
        throw new Error(response.message || "Mobile money payment failed");
      }
    } catch (error) {
      this.logger.error("Palmpay mobile money payment failed", {
        error: error.message,
        paymentId: request.paymentId,
      });
      throw error;
    }
  }
  private formatPrivateKey(key: string): string {
    const PEM_BEGIN = "-----BEGIN PRIVATE KEY-----\n";
    const PEM_END = "\n-----END PRIVATE KEY-----";
    let formattedKey = key.trim();
    if (!formattedKey.includes("BEGIN PRIVATE KEY")) {
      formattedKey = PEM_BEGIN + formattedKey;
    }
    if (!formattedKey.includes("END PRIVATE KEY")) {
      formattedKey = formattedKey + PEM_END;
    }
    return formattedKey;
  }
  private formatPublicKey(key: string): string {
    const PEM_BEGIN = "-----BEGIN PUBLIC KEY-----\n";
    const PEM_END = "\n-----END PUBLIC KEY-----";
    let formattedKey = key.trim();
    if (!formattedKey.includes("BEGIN PUBLIC KEY")) {
      formattedKey = PEM_BEGIN + formattedKey;
    }
    if (!formattedKey.includes("END PUBLIC KEY")) {
      formattedKey = formattedKey + PEM_END;
    }
    return formattedKey;
  }
  async handleVirtualAccountWebhook(
    request: WebhookRequest,
  ): Promise<WebhookResponse> {
    try {
      const webhookPayload: PalmpayVirtualAccountWebhookPayload = request.body;
      if (!webhookPayload) {
        throw new BadRequestException("Invalid webhook payload: empty body");
      }
      if (!webhookPayload.orderNo) {
        throw new BadRequestException(
          "Invalid webhook payload: missing orderNo",
        );
      }
      if (webhookPayload.orderStatus === undefined) {
        throw new BadRequestException(
          "Invalid webhook payload: missing orderStatus",
        );
      }
      if (!webhookPayload.payerAccountNo) {
        throw new BadRequestException(
          "Invalid webhook payload: missing payerAccountNo",
        );
      }
      if (!webhookPayload.payerAccountName) {
        throw new BadRequestException(
          "Invalid webhook payload: missing payerAccountName",
        );
      }
      if (!webhookPayload.payerBankName) {
        throw new BadRequestException(
          "Invalid webhook payload: missing payerBankName",
        );
      }
      if (webhookPayload.sign) {
        const isValid = this.verifyWebhookSignature(
          webhookPayload,
          webhookPayload.sign,
        );
        if (!isValid) {
          this.logger.error(
            "Palmpay virtual account webhook signature verification failed",
            {
              orderNo: webhookPayload.orderNo,
            },
          );
        }
      } else {
        this.logger.warn(
          "Palmpay virtual account webhook missing signature - cannot verify authenticity",
        );
      }
      const payment = await this.paymentRepository.findOne({
        where: { providerTransactionId: webhookPayload.orderNo },
        relations: ["order", "order.orderItems"],
      });
      if (!payment) {
        this.logger.warn(
          `Payment not found for orderNo: ${webhookPayload.orderNo}`,
        );
        throw new NotFoundException(
          `Payment not found for orderNo: ${webhookPayload.orderNo}`,
        );
      }
      const mappedStatus =
        webhookPayload.orderStatus !== undefined
          ? this.mapPalmpayStatus(webhookPayload.orderStatus)
          : null;
      if (
        payment.providerTransactionId === webhookPayload.orderNo &&
        mappedStatus &&
        payment.providerStatus === mappedStatus
      ) {
        return {
          success: true,
          status: "processed",
          message: "Webhook already processed (idempotent)",
          transactionId: webhookPayload.orderNo,
        };
      }
      if (webhookPayload.orderNo && !payment.providerTransactionId) {
        payment.providerTransactionId = webhookPayload.orderNo;
      }
      const validatedWebhookData =
        this.paymentResponseValidatorService.validatePaymentResponse(
          {
            success: true,
            transactionId:
              webhookPayload.orderNo ||
              payment.providerTransactionId ||
              payment.orderNumber,
            status: mappedStatus || (payment.status as string),
            message: `Virtual account payment status: ${this.mapPalmpayStatus(webhookPayload.orderStatus)}`,
            data: {
              ...webhookPayload,
              amount: webhookPayload.orderAmount / 100,
            },
          },
          "palmpay",
          payment.providerTransactionId,
        );
      if (validatedWebhookData.transactionId) {
        payment.providerTransactionId = validatedWebhookData.transactionId;
      }
      if (mappedStatus) {
        payment.providerStatus = mappedStatus as any;
      }
      const encryptedWebhookData =
        this.paymentResponseValidatorService.encryptResponseData(
          validatedWebhookData,
        );
      payment.responseData = {
        success: validatedWebhookData.success,
        message: validatedWebhookData.message,
        data: validatedWebhookData.data,
        transactionId: validatedWebhookData.transactionId,
        encryptedData: encryptedWebhookData,
      };
      if (webhookPayload.orderStatus !== undefined) {
        const status = this.mapPalmpayStatus(webhookPayload.orderStatus);
        switch (status) {
          case "pending":
            payment.status = "pending" as any;
            break;
          case "completed":
            payment.status = "completed" as any;
            break;
          case "failed":
            payment.status = "failed" as any;
            break;
          case "cancelled":
            payment.status = "cancelled" as any;
            break;
        }
      }
      await this.paymentRepository.save(payment);
      if (!payment.emailNotificationSent || !payment.webhookNotificationSent) {
        if (webhookPayload.orderStatus !== undefined) {
          await this.sendNotificationsForWebhook(
            payment,
            this.mapPalmpayStatus(webhookPayload.orderStatus),
          );
        }
      }
      if (webhookPayload.orderStatus === 2) {
        try {
          const amountInCurrency = webhookPayload.orderAmount / 100;
          payment.order.paidAmount = amountInCurrency;
          payment.order.paidAt = new Date(webhookPayload.updateTime);
          await this.orderRepository.save(payment.order);
        } catch (orderError) {
          this.logger.error(
            `Failed to update order payment fields for ${payment.order.orderNumber}: ${orderError.message}`,
          );
        }
      } else if (webhookPayload.orderStatus === 3) {
        try {
          payment.order.status = "failed" as any;
          await this.orderRepository.save(payment.order);
        } catch (orderError) {
          this.logger.error(
            `Failed to mark order ${payment.order.orderNumber} as failed: ${orderError.message}`,
          );
        }
      } else if (webhookPayload.orderStatus === 4) {
        try {
          payment.order.status = "cancelled" as any;
          await this.orderRepository.save(payment.order);
        } catch (orderError) {
          this.logger.error(
            `Failed to mark order ${payment.order.orderNumber} as cancelled: ${orderError.message}`,
          );
        }
      }
      return {
        success: true,
        status: "processed",
        message: "Virtual account webhook processed successfully",
        transactionId: webhookPayload.orderNo,
      };
    } catch (error) {
      this.logger.error("Palmpay virtual account webhook processing failed", {
        error: error.message,
        orderNo: request.body?.orderNo,
      });
      throw error;
    }
  }
  private verifyWebhookSignature(
    payload:
      | PalmpayMobileMoneyWebhookPayload
      | PalmpayVirtualAccountWebhookPayload,
    signature: string,
  ): boolean {
    if (!this.publicKey) {
      this.logger.warn(
        "PALMPAY_PUBLIC_KEY not configured, skipping signature verification",
      );
      return true;
    }
    try {
      const decodedSignature = decodeURIComponent(signature);
      const queryString = Object.entries(payload)
        .filter(
          ([key, value]) =>
            key !== "sign" &&
            value !== undefined &&
            value !== null &&
            String(value).trim() !== "",
        )
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}=${String(value)}`)
        .join("&");
      const md5Str = crypto
        .createHash("md5")
        .update(queryString)
        .digest("hex")
        .toUpperCase()
        .trim();
      const formattedPublicKey = this.formatPublicKey(this.publicKey);
      const verifier = crypto.createVerify("RSA-SHA1");
      verifier.update(md5Str);
      verifier.end();
      const isValid = verifier.verify(
        formattedPublicKey,
        decodedSignature,
        "base64",
      );
      if (!isValid) {
        this.logger.error("Webhook signature verification failed");
      }
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to verify webhook signature: ${error.message}`);
      return false;
    }
  }
  private async makeApiRequest(
    endpoint: string,
    data: any = {},
    method: "GET" | "POST" = "POST",
  ): Promise<PalmpayApiResponse> {
    try {
      const queryString = Object.entries(data)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}=${String(value)}`)
        .join("&");
      const md5Str = crypto
        .createHash("md5")
        .update(queryString)
        .digest("hex")
        .toUpperCase()
        .trim();
      const formattedPrivateKey = this.formatPrivateKey(this.privateKey);
      const signer = crypto.createSign("RSA-SHA1");
      signer.update(md5Str);
      signer.end();
      const signature = signer.sign(formattedPrivateKey, "base64");
      const countryCodeMap: Record<string, string> = {
        GHS: "GH",
        NGN: "NG",
        KES: "KE",
        TZS: "TZ",
      };
      const countryCode = data.currency?.toUpperCase()
        ? countryCodeMap[data.currency.toUpperCase()] || "GH"
        : "GH";
      const config = {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          CountryCode: countryCode,
          Authorization: `Bearer ${this.appId}`,
          Signature: signature,
        },
        timeout: 30000,
      };
      const response: AxiosResponse =
        method === "GET"
          ? await axios.get(`${this.baseUrl}${endpoint}`, config)
          : await axios.post(`${this.baseUrl}${endpoint}`, data, config);
      if (
        response.data?.respCode &&
        response.data.respCode !== "00000" &&
        response.data.respCode !== "00000000"
      ) {
        return {
          success: false,
          data: response.data,
          message: response.data?.respMsg || "Palmpay API error",
          error: response.data?.respCode || "Unknown error",
        };
      }
      return {
        success: true,
        data: response.data,
        message: "Request successful",
      };
    } catch (error) {
      this.logger.error("Palmpay API request failed", {
        error: error.message,
      });
      if (error.response) {
        this.logger.error("Palmpay API error response", {
          status: error.response.status,
        });
        return {
          success: false,
          message: error.response.data?.message || "API request failed",
          error: error.response.data?.error || error.message,
        };
      } else if (error.request) {
        this.logger.error("Palmpay API network error");
        return {
          success: false,
          message: "Network error - unable to reach Palmpay API",
          error: error.message,
        };
      } else {
        return {
          success: false,
          message: "Request configuration error",
          error: error.message,
        };
      }
    }
  }
  private async sendNotificationsForWebhook(
    payment: Payment,
    webhookStatus: string,
  ): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: payment.orderId },
        relations: ["customer", "orderItems"],
      });
      if (!order) {
        this.logger.error(`Order not found for payment ${payment.id}`);
        return;
      }
      const customerEmail = order.customer.email;
      const customerName =
        order.customer.firstName && order.customer.lastName
          ? `${order.customer.firstName} ${order.customer.lastName}`
          : order.customer.firstName || "Customer";
      if (webhookStatus === "completed" && !payment.emailNotificationSent) {
        const paymentMethodName =
          order.paymentMethodSnapshot?.name || "Payment";
        await this.emailService.sendPaymentSuccessEmail(customerEmail, {
          orderNumber: order.orderNumber || order.id,
          amount: Number(payment.amount),
          paymentMethod: paymentMethodName,
          customerName,
        });
        await this.paymentRepository.update(payment.id, {
          emailNotificationSent: true,
          lastNotificationSentAt: new Date(),
        });
      } else if (webhookStatus === "failed" && !payment.emailNotificationSent) {
        await this.emailService.sendPaymentFailureEmail(customerEmail, {
          orderNumber: order.orderNumber || order.id,
          amount: Number(payment.amount),
          errorMessage: "Payment was not successful. Please try again.",
          customerName,
        });
        await this.paymentRepository.update(payment.id, {
          emailNotificationSent: true,
          lastNotificationSentAt: new Date(),
        });
      }
      if (webhookStatus === "completed" && !payment.webhookNotificationSent) {
        await this.sendAdminWebhookForCompletedPayment(order, payment);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send webhook notifications: ${error.message}`,
      );
    }
  }
  private async sendAdminWebhookForCompletedPayment(
    order: Order,
    payment: Payment,
  ): Promise<void> {
    try {
      const webhookPayload = {
        orderId: order.id,
        customerId: order.customer.id,
        totalAmount: Number(order.totalAmount),
        currency: order.localCurrencyCode!,
        status: order.status,
        paymentStatus: "paid",
        items: order.orderItems.map((item) => ({
          productId: item.originalProductId || "unknown",
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        orderDate: order.createdAt.toISOString(),
        customerEmail: order.customer.email,
        customerName:
          order.customer.firstName && order.customer.lastName
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : undefined,
        notes: `Payment completed via webhook - Transaction: ${payment.providerTransactionId}`,
      };
      const success = await this.webhookService.retryWebhook(
        () => this.webhookService.sendOrderNotification(webhookPayload),
        3,
        1000,
      );
      if (success) {
        await this.paymentRepository.update(payment.id, {
          webhookNotificationSent: true,
          lastNotificationSentAt: new Date(),
        });
      } else {
        this.logger.error(
          "Failed to send admin webhook for completed payment",
          {
            orderId: order.id,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send admin webhook for completed payment: ${error.message}`,
      );
    }
  }
}
