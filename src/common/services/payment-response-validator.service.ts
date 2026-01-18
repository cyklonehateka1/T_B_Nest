import { Injectable, Logger } from "@nestjs/common";

export interface PaymentResponseData {
  success: boolean;
  transactionId?: string;
  reference?: string;
  status?: string;
  message?: string;
  errors?: string[];
  data?: Record<string, any>;
}

@Injectable()
export class PaymentResponseValidatorService {
  private readonly logger = new Logger(PaymentResponseValidatorService.name);

  validatePaymentResponse(response: PaymentResponseData): PaymentResponseData {
    if (!response || typeof response !== "object") {
      this.logger.warn("Invalid payment response: not an object");
      return {
        success: false,
        errors: ["Invalid payment response format"],
      };
    }

    if (response.success === false && !response.errors?.length) {
      this.logger.warn("Payment response indicates failure but no errors provided");
      return {
        ...response,
        errors: response.errors || ["Payment failed"],
      };
    }

    return response;
  }
}
