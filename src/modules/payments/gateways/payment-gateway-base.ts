import { Logger } from "@nestjs/common";
export interface PaymentRequest {
  paymentId: string;
  amount: number;
  currency: string;
  orderNumber: string;
  paymentReference: string;
  paymentMethod: string;
  additionalData?: any;
}
export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  reference?: string;
  status: string;
  checkoutUrl?: string;
  providerReference?: string;
  message?: string;
  errors?: string[];
  data?: Record<string, any>;
}
export interface PaymentStatusRequest {
  transactionId: string;
  paymentId: string;
}
export interface PaymentStatusResponse {
  success: boolean;
  status: string;
  transactionId: string;
  amount?: number;
  currency?: string;
  message?: string;
  errors?: string[];
  data?: Record<string, any>;
}
export interface WebhookRequest {
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
}
export interface WebhookResponse {
  success: boolean;
  status: string;
  transactionId?: string;
  message?: string;
  errors?: string[];
}
export abstract class PaymentGatewayBase {
  protected logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
  abstract getGatewayId(): string;
  abstract getGatewayName(): string;
  abstract getSupportedPaymentMethods(): string[];
  abstract getSupportedCurrencies(): string[];
  abstract validateConfiguration(): boolean;
  abstract initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract checkPaymentStatus(
    request: PaymentStatusRequest,
  ): Promise<PaymentStatusResponse>;
  abstract handleWebhook(request: WebhookRequest): Promise<WebhookResponse>;
  isAvailable(): boolean {
    return this.validateConfiguration();
  }
  supportsPaymentMethod(paymentMethod: string): boolean {
    return this.getSupportedPaymentMethods().includes(paymentMethod);
  }
  supportsCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency);
  }
  getPaymentMethodHandlingMode(
    paymentMethod: string,
  ): "checkout_url" | "direct" {
    return "direct";
  }
}
