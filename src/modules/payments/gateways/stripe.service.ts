import { Injectable, Logger } from "@nestjs/common";
import {
  PaymentGatewayBase,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusRequest,
  PaymentStatusResponse,
  WebhookRequest,
  WebhookResponse,
} from "./payment-gateway-base";
@Injectable()
export class StripeService extends PaymentGatewayBase {
  protected logger = new Logger(StripeService.name);
  constructor() {
    super(new Logger(StripeService.name));
  }
  getGatewayId(): string {
    return "stripe";
  }
  getGatewayName(): string {
    return "Stripe";
  }
  getSupportedPaymentMethods(): string[] {
    return ["bank_card"];
  }
  getSupportedCurrencies(): string[] {
    return ["USD", "EUR", "GBP"];
  }
  validateConfiguration(): boolean {
    return false;
  }
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Initiating Stripe payment for ${request.paymentId}`);
    throw new Error("Stripe payment initiation not yet implemented");
  }
  async checkPaymentStatus(
    request: PaymentStatusRequest,
  ): Promise<PaymentStatusResponse> {
    this.logger.log(
      `Checking Stripe payment status for ${request.transactionId}`,
    );
    throw new Error("Stripe status check not yet implemented");
  }
  async handleWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    this.logger.log("Handling Stripe webhook");
    throw new Error("Stripe webhook handling not yet implemented");
  }
}
