import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import axios, { AxiosResponse } from "axios";
export interface OrderNotificationPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  orderDate: string;
  customerEmail?: string;
  customerName?: string;
  shippingAddress?: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
  };
  notes?: string;
}
export interface OrderStatusUpdatePayload {
  orderId: string;
  status: string;
  updatedAt: string;
  reason?: string;
}
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly adminBaseUrl: string;
  readonly webhookSecret: string;
  constructor(private readonly configService: ConfigService) {
    this.adminBaseUrl =
      this.configService.get<string>("ADMIN_API_BASEURL") ||
      "https:
    this.webhookSecret =
      this.configService.get<string>("WEBHOOK_SECRET") ||
      "default-webhook-secret";
  }
  generateSignature(
    webhookId: string,
    timestamp: string,
    payload: string,
    secret: string,
  ): string {
    const data = `${webhookId}.${timestamp}.${payload}`;
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
  }
  async sendOrderNotification(
    payload: OrderNotificationPayload,
  ): Promise<boolean> {
    try {
      const webhookUrl = `${this.adminBaseUrl}/webhooks/orders`;
      const webhookId = crypto.randomUUID();
      const timestamp = Date.now().toString();
      const payloadString = JSON.stringify(payload);
      const signature = this.generateSignature(
        webhookId,
        timestamp,
        payloadString,
        this.webhookSecret,
      );
      const response: AxiosResponse = await axios.post(webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp,
          "X-Webhook-ID": webhookId,
          "User-Agent": "Tipster-Betting-App/1.0",
        },
        timeout: 10000,
      });
      if (response.status >= 200 && response.status < 300) {
        return true;
      } else {
        this.logger.warn(
          `Order notification webhook returned status ${response.status} for order: ${payload.orderId}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order notification webhook for order ${payload.orderId}: ${error.message}`,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(`Response status: ${error.response?.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response?.data)}`,
        );
      }
      return false;
    }
  }
  async sendOrderStatusUpdate(
    payload: OrderStatusUpdatePayload,
  ): Promise<boolean> {
    try {
      const webhookUrl = `${this.adminBaseUrl}/webhooks/orders`;
      const webhookId = crypto.randomUUID();
      const timestamp = Date.now().toString();
      const payloadString = JSON.stringify(payload);
      const signature = this.generateSignature(
        webhookId,
        timestamp,
        payloadString,
        this.webhookSecret,
      );
      const response: AxiosResponse = await axios.post(webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp,
          "X-Webhook-ID": webhookId,
          "User-Agent": "Tipster-Betting-App/1.0",
        },
        timeout: 10000,
      });
      if (response.status >= 200 && response.status < 300) {
        return true;
      } else {
        this.logger.warn(
          `Order status update webhook returned status ${response.status} for order: ${payload.orderId}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send order status update webhook for order ${payload.orderId}: ${error.message}`,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(`Response status: ${error.response?.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response?.data)}`,
        );
      }
      return false;
    }
  }
  async testWebhookConnectivity(): Promise<boolean> {
    try {
      const webhookUrl = `${this.adminBaseUrl}/webhooks/health`;
      this.logger.log(`Testing webhook connectivity to: ${webhookUrl}`);
      const response: AxiosResponse = await axios.get(webhookUrl, {
        timeout: 5000,
        headers: {
          "User-Agent": "Tipster-Betting-App/1.0",
        },
      });
      if (response.status >= 200 && response.status < 300) {
        return true;
      } else {
        this.logger.warn(
          `Webhook connectivity test returned status: ${response.status}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `❌ Webhook connectivity test failed: ${error.message}`,
      );
      return false;
    }
  }
  async retryWebhook(
    webhookFunction: () => Promise<boolean>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await webhookFunction();
        if (success) {
          return true;
        }
      } catch (error) {
        this.logger.warn(`Webhook attempt ${attempt} failed: ${error.message}`);
      }
      if (attempt < maxRetries) {
        const delay = Math.max(0, baseDelay * Math.pow(2, attempt - 1));
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this.logger.error(`Webhook failed after ${maxRetries} attempts`);
    return false;
  }
}
