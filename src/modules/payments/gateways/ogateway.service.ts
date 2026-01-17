import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios, { AxiosResponse } from "axios";
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
  BankTransferPaymentData,
  isMobileMoneyPaymentData,
  isBankTransferPaymentData,
} from "../order-creation.service";
import { PaymentResponseValidatorService } from "../../common/services/payment-response-validator.service";
import { EmailService } from "../../email/email.service";
import { WebhookService } from "../../common/services/webhook.service";
import { Payment } from "../../common/entities/payment.entity";
import { Order } from "../../common/entities/order.entity";
import { OrderService } from "../orders.service";
export interface OGatewayMobileMoneyRequest {
  amount: number;
  reason: string;
  currency: string;
  network: string;
  accountName: string;
  accountNumber: string;
  reference: string;
  callbackURL?: string;
}
export interface OGatewayBankTransferRequest {
  currency: string;
  reference: string;
  phone_number: string;
  email: string;
  first_name: string;
  last_name: string;
  amount: number;
}
export interface OGatewayBankTransferResponse {
  type: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}
export interface OGatewayApiResponse {
  success?: boolean;
  data?: any;
  message?: string;
  error?: string;
}
export interface OGatewayWebhookPayload {
  id: string;
  amount: number;
  fee: number;
  currency: string;
  status: "INITIATED" | "FAILED" | "COMPLETED";
  channel: string;
  type: string;
  customer: {
    accountName: string;
    accountNumber: string;
  };
  metadata: Record<string, any>;
  reason: string;
  reference_business: string;
  network?: string;
  created_at: string;
  updated_at: string;
}
@Injectable()
export class OGatewayService extends PaymentGatewayBase {
  protected readonly logger = new Logger(OGatewayService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
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
  ) {
    super(new Logger(OGatewayService.name));
    const apiKey = this.configService.get<string>("OGATEWAY_API_KEY");
    if (!apiKey) {
      throw new Error("OGATEWAY_API_KEY is not configured");
    }
    this.apiKey = apiKey;
    const baseUrl = this.configService.get<string>("OGATEWAY_BASE_URL");
    if (!baseUrl) {
      throw new Error("OGATEWAY_BASE_URL is not configured");
    }
    this.baseUrl = baseUrl;
  }
  getGatewayId(): string {
    return "ogateway";
  }
  getGatewayName(): string {
    return "OGateway";
  }
  getSupportedPaymentMethods(): string[] {
    return ["mobile_money", "bank_transfer"];
  }
  getSupportedCurrencies(): string[] {
    return ["GHS", "NGN", "USD"];
  }
  validateConfiguration(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (request.paymentMethod === "mobile_money") {
        return await this.initiateMobileMoneyPayment(request);
      } else if (request.paymentMethod === "bank_transfer") {
        return await this.initiateBankTransferPayment(request);
      } else {
        throw new BadRequestException(
          `Unsupported payment method: ${request.paymentMethod}`,
        );
      }
    } catch (error) {
      this.logger.error(`OGateway payment initiation failed: ${error.message}`);
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
      const response = await this.makeApiRequest(
        `/payments/${request.transactionId}`,
        {},
        "GET",
      );
      if (response.success && response.data) {
        const status = this.mapOGatewayStatus(response.data.status);
        return {
          success: true,
          status,
          transactionId: request.transactionId,
          amount: response.data.amount,
          currency: response.data.currency,
          message:
            response.data.message || "Payment status retrieved successfully",
          data: response.data,
        };
      } else {
        return {
          success: false,
          status: "error",
          transactionId: request.transactionId,
          message: response.message || "Failed to check payment status",
          errors: [response.error || "Unknown error"],
        };
      }
    } catch (error) {
      this.logger.error(`OGateway status check failed: ${error.message}`);
      return {
        success: false,
        status: "error",
        transactionId: request.transactionId,
        message: error.message,
        errors: [error.message],
      };
    }
  }
  private mapOGatewayStatus(ogatewayStatus: string): string {
    const statusMap: Record<string, string> = {
      PENDING: "pending",
      PROCESSING: "processing",
      INITIATED: "pending",
      COMPLETED: "completed",
      SUCCESS: "completed",
      FAILED: "failed",
      CANCELLED: "cancelled",
      EXPIRED: "expired",
      REJECTED: "failed",
    };
    return statusMap[ogatewayStatus?.toUpperCase()] || "pending";
  }
  async handleWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      const webhookPayload: OGatewayWebhookPayload = request.body;
      if (!webhookPayload || !webhookPayload.reference_business) {
        throw new BadRequestException(
          "Invalid webhook payload: missing reference_business",
        );
      }
      const payment = await this.paymentRepository.findOne({
        where: { paymentReference: webhookPayload.reference_business },
        relations: ["order", "order.orderItems"],
      });
      if (!payment) {
        throw new NotFoundException(
          `Payment not found for reference: ${webhookPayload.reference_business}`,
        );
      }
      if (
        payment.providerTransactionId === webhookPayload.id &&
        payment.providerStatus === this.mapOGatewayStatus(webhookPayload.status)
      ) {
        return {
          success: true,
          status: "processed",
          message: "Webhook already processed (idempotent)",
          transactionId: webhookPayload.id,
        };
      }
      const validatedWebhookData =
        this.paymentResponseValidatorService.validatePaymentResponse(
          {
            success: true,
            transactionId: webhookPayload.id,
            status: this.mapOGatewayStatus(webhookPayload.status),
            message: "Webhook processed",
            data: webhookPayload,
          },
          "ogateway",
          payment.providerTransactionId,
        );
      payment.providerTransactionId = validatedWebhookData.transactionId;
      payment.providerStatus = validatedWebhookData.status as any;
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
      if (validatedWebhookData.data?.customer) {
        payment.accountName = validatedWebhookData.data.customer.accountName;
        payment.accountNumber =
          validatedWebhookData.data.customer.accountNumber;
      }
      if (validatedWebhookData.data?.network) {
        payment.network = validatedWebhookData.data.network;
      }
      switch (webhookPayload.status) {
        case "INITIATED":
          payment.status = "pending" as any;
          break;
        case "COMPLETED":
          payment.status = "completed" as any;
          break;
        case "FAILED":
          payment.status = "failed" as any;
          break;
        default:
          break;
      }
      await this.paymentRepository.save(payment);
      if (!payment.emailNotificationSent || !payment.webhookNotificationSent) {
        await this.sendNotificationsForWebhook(payment, webhookPayload.status);
      }
      if (webhookPayload.status === "COMPLETED") {
        try {
          payment.order.paidAmount = payment.amount;
          payment.order.paidAt = new Date();
          await this.orderRepository.save(payment.order);
          this.logger.log(
            `OGateway webhook: Payment ${payment.id} completed - Order ${payment.order.orderNumber} ready for fulfillment`,
          );
        } catch (orderError) {
          this.logger.error(
            `Failed to update order payment fields for ${payment.order.orderNumber}: ${orderError.message}`,
          );
        }
      } else if (webhookPayload.status === "FAILED") {
        try {
          payment.order.status = "failed" as any;
          await this.orderRepository.save(payment.order);
          this.logger.log(
            `OGateway webhook: Payment ${payment.id} failed - Order ${payment.order.orderNumber} marked as failed`,
          );
        } catch (orderError) {
          this.logger.error(
            `Failed to mark order ${payment.order.orderNumber} as failed: ${orderError.message}`,
          );
        }
      }
      return {
        success: true,
        status: "processed",
        message: "Webhook processed successfully",
        transactionId: webhookPayload.id,
      };
    } catch (error) {
      this.logger.error(`OGateway webhook handling failed: ${error.message}`, {
        error: error.stack,
        webhookBody: request.body,
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
    const { accountName, accountNumber, network } = request.additionalData;
    const mobileMoneyRequest: OGatewayMobileMoneyRequest = {
      amount: request.amount,
      reason: `Payment for order ${request.orderNumber}`,
      currency: request.currency,
      network,
      accountName,
      accountNumber,
      reference: request.paymentReference,
      callbackURL: `${process.env.APP_URL}/webhooks/ogateway`,
    };
    try {
      const response = await this.makeApiRequest(
        "/collections/mobilemoney",
        mobileMoneyRequest,
      );
      if (response.success) {
        const transactionId =
          response.data?.id ||
          response.data?.transactionId ||
          response.data?.transaction_id ||
          response.data?.reference ||
          `momo_${Date.now()}`;
        return {
          success: true,
          transactionId,
          reference: request.paymentReference,
          status: response.data?.status || "pending",
          message:
            response.message || "Mobile money payment initiated successfully",
          data: {
            paymentMethod: "mobile_money",
            amount: request.amount,
            currency: request.currency,
            accountName,
            accountNumber,
            network,
            apiResponse: response.data,
          },
        };
      } else {
        throw new Error(response.message || "Mobile money payment failed");
      }
    } catch (error) {
      this.logger.error(`Mobile money payment failed: ${error.message}`);
      throw error;
    }
  }
  private async initiateBankTransferPayment(
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    if (
      !request.additionalData ||
      !isBankTransferPaymentData(request.additionalData)
    ) {
      throw new BadRequestException(
        "Bank transfer payment requires phone_number, email, first_name, and last_name",
      );
    }
    const { phone_number, email, first_name, last_name } =
      request.additionalData;
    const bankTransferRequest: OGatewayBankTransferRequest = {
      currency: request.currency,
      reference: request.paymentReference,
      phone_number,
      email,
      first_name,
      last_name,
      amount: request.amount,
    };
    try {
      const response = await this.makeApiRequest(
        "/virtual-accounts",
        bankTransferRequest,
      );
      if (response.success) {
        const bankData = response.data as OGatewayBankTransferResponse;
        const transactionId =
          response.data?.transactionId ||
          response.data?.transaction_id ||
          response.data?.id ||
          response.data?.reference ||
          request.orderNumber;
        return {
          success: true,
          transactionId,
          reference: request.paymentReference,
          status: response.data?.status || "pending",
          message:
            response.message ||
            "Bank transfer virtual account created successfully",
          data: {
            paymentMethod: "bank_transfer",
            amount: request.amount,
            currency: request.currency,
            bankDetails: {
              bankCode: bankData.bank_code,
              bankName: bankData.bank_name,
              accountName: bankData.account_name,
              accountNumber: bankData.account_number,
            },
            customerDetails: {
              phoneNumber: phone_number,
              email,
              firstName: first_name,
              lastName: last_name,
            },
            apiResponse: response.data,
          },
        };
      } else {
        throw new Error(response.message || "Bank transfer payment failed");
      }
    } catch (error) {
      this.logger.error(`Bank transfer payment failed: ${error.message}`);
      throw error;
    }
  }
  private async makeApiRequest(
    endpoint: string,
    data: any = {},
    method: "GET" | "POST" = "POST",
  ): Promise<OGatewayApiResponse> {
    try {
      const config = {
        headers: {
          Authorization: `${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "GiftCard-Customer-App/1.0",
        },
        timeout: 30000,
      };
      const response: AxiosResponse =
        method === "GET"
          ? await axios.get(`${this.baseUrl}${endpoint}`, config)
          : await axios.post(`${this.baseUrl}${endpoint}`, data, config);
      return {
        success: true,
        data: response.data,
        message: "Request successful",
      };
    } catch (error) {
      this.logger.error(`OGateway API request failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`OGateway API error response:`, error.response.data);
        return {
          success: false,
          message: error.response.data?.message || "API request failed",
          error: error.response.data?.error || error.message,
        };
      } else if (error.request) {
        this.logger.error(`OGateway API network error:`, error.request);
        return {
          success: false,
          message: "Network error - unable to reach OGateway API",
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
      if (webhookStatus === "COMPLETED" && !payment.emailNotificationSent) {
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
        this.logger.log(
          `Payment success email sent - Order ${order.orderNumber || order.id}, Customer: ${customerEmail}`,
        );
      } else if (webhookStatus === "FAILED" && !payment.emailNotificationSent) {
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
        this.logger.log(
          `Payment failure email sent - Order ${order.orderNumber || order.id}, Customer: ${customerEmail}`,
        );
      }
      if (webhookStatus === "COMPLETED" && !payment.webhookNotificationSent) {
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
        this.logger.log(
          `Admin webhook sent - Order ${order.orderNumber || order.id}`,
        );
      } else {
        this.logger.error(
          `Failed to send admin webhook for order ${order.orderNumber || order.id} after retries`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send admin webhook for completed payment: ${error.message}`,
      );
    }
  }
}
