import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan } from "typeorm";
import { Cron } from "@nestjs/schedule";
import { Payment, PaymentStatus } from "../../common/entities/payment.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { PurchaseStatusType } from "../../common/enums/purchase-status-type.enum";
import { PaymentGateway } from "../../common/entities/payment-gateway.entity";
import { PaymentGatewayStatus } from "../../common/entities/payment-gateway.entity";
import { PaymentType } from "../../common/enums/payment-type.enum";
import { PaymentGatewayRegistryService } from "./gateways/payment-gateway-registry.service";
import { EmailService } from "../email/email.service";
import { WebhookService } from "../../common/services/webhook.service";
import { PaymentStatusRequest } from "./gateways/payment-gateway-base";
import { EscrowService } from "../tip-evaluation/escrow.service";

@Injectable()
export class PaymentStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(PaymentStatusScheduler.name);

  // Configuration
  private readonly cronEnabled: boolean;
  private readonly checkEnabled: boolean;
  private readonly cleanupEnabled: boolean;
  private readonly maxPaymentAgeMinutes: number;
  private readonly cleanupAgeHours: number;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(PaymentGateway)
    private readonly paymentGatewayRepository: Repository<PaymentGateway>,
    private readonly paymentGatewayRegistryService: PaymentGatewayRegistryService,
    private readonly emailService: EmailService,
    private readonly webhookService: WebhookService,
    private readonly escrowService: EscrowService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled =
      this.configService.get<string>("PAYMENT_STATUS_CRON_ENABLED") === "true";
    this.checkEnabled =
      this.configService.get<string>("PAYMENT_STATUS_CHECK_ENABLED") === "true";
    this.cleanupEnabled =
      this.configService.get<string>("PAYMENT_STATUS_CLEANUP_ENABLED") ===
      "true";
    this.maxPaymentAgeMinutes = parseInt(
      this.configService.get<string>("PAYMENT_STATUS_CHECK_MAX_AGE_MINUTES") ||
        "30",
      10,
    );
    this.cleanupAgeHours = parseInt(
      this.configService.get<string>("PAYMENT_STATUS_CLEANUP_AGE_HOURS") ||
        "24",
      10,
    );
  }

  onModuleInit() {
    this.logger.log("=== PaymentStatusScheduler Initialization ===");
    this.logger.log(`PAYMENT_STATUS_CRON_ENABLED: ${this.cronEnabled}`);
    this.logger.log(`PAYMENT_STATUS_CHECK_ENABLED: ${this.checkEnabled}`);
    this.logger.log(`PAYMENT_STATUS_CLEANUP_ENABLED: ${this.cleanupEnabled}`);
    this.logger.log(
      `Max payment age for checking: ${this.maxPaymentAgeMinutes} minutes`,
    );
    this.logger.log(`Cleanup age threshold: ${this.cleanupAgeHours} hours`);

    if (!this.cronEnabled) {
      this.logger.warn(
        "Payment status cron is disabled (PAYMENT_STATUS_CRON_ENABLED=false). All cron jobs are deactivated.",
      );
    } else {
      if (this.checkEnabled) {
        this.logger.log(
          `✓ Payment status check enabled - checking payments created within last ${this.maxPaymentAgeMinutes} minutes`,
        );
        this.logger.log(
          `  Cron job will run every 6 hours: @Cron("0 */6 * * *")`,
        );
      } else {
        this.logger.warn(
          "Payment status check is disabled (PAYMENT_STATUS_CHECK_ENABLED=false)",
        );
      }
      if (this.cleanupEnabled) {
        this.logger.log(
          `✓ Payment cleanup enabled - marking pending payments older than ${this.cleanupAgeHours} hours as failed`,
        );
        this.logger.log(
          `  Cleanup cron job will run daily at 2 AM: @Cron("0 2 * * *")`,
        );
      } else {
        this.logger.warn(
          "Payment cleanup is disabled (PAYMENT_STATUS_CLEANUP_ENABLED=false)",
        );
      }
    }
    this.logger.log("=== PaymentStatusScheduler Initialization Complete ===");
  }

  /**
   * Test cron to verify cron system is working
   * Runs every minute and logs a message
   */
  @Cron("* * * * *")
  async testCronJob(): Promise<void> {
    this.logger.log(
      `[TEST CRON] PaymentStatusScheduler cron system is working! (runs every minute)`,
    );
  }

  /**
   * Check pending payments every 6 hours
   * Only processes payments that are not too old
   */
  @Cron("0 */6 * * *")
  async checkPendingPayments(): Promise<void> {
    this.logger.debug(
      `[CRON] checkPendingPayments called - cronEnabled: ${this.cronEnabled}, checkEnabled: ${this.checkEnabled}`,
    );

    if (!this.cronEnabled || !this.checkEnabled) {
      this.logger.debug(
        "[CRON] checkPendingPayments skipped - cron or check is disabled",
      );
      return;
    }

    this.logger.log("[CRON] Starting payment status check...");

    try {
      const pendingPayments: Payment[] =
        await this.getPendingPaymentsWithinTimeLimit();

      if (pendingPayments.length === 0) {
        this.logger.debug("[CRON] No pending payments found to check");
        return;
      }

      this.logger.log(
        `[CRON] Checking status for ${pendingPayments.length} pending payment(s)`,
      );

      for (const payment of pendingPayments) {
        try {
          await this.checkAndUpdatePaymentStatus(payment);
        } catch (error) {
          this.logger.error(
            `Failed to check payment ${payment.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in checkPendingPayments: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Clean up old pending payments daily at 2 AM
   * Marks very old pending payments as failed
   */
  @Cron("0 2 * * *")
  async cleanupOldPendingPayments(): Promise<void> {
    this.logger.debug(
      `[CRON] cleanupOldPendingPayments called - cronEnabled: ${this.cronEnabled}, cleanupEnabled: ${this.cleanupEnabled}`,
    );

    if (!this.cronEnabled || !this.cleanupEnabled) {
      this.logger.debug(
        "[CRON] cleanupOldPendingPayments skipped - cron or cleanup is disabled",
      );
      return;
    }

    this.logger.log("[CRON] Starting payment cleanup...");

    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - this.cleanupAgeHours);

      const oldPendingPayments = await this.paymentRepository.find({
        where: {
          status: PaymentStatus.PENDING,
          type: PaymentType.TIP_PURCHASE,
          createdAt: LessThan(cutoffTime),
        },
        relations: ["purchase"],
      });

      if (oldPendingPayments.length === 0) {
        this.logger.log("No old pending payments to cleanup");
        return;
      }

      this.logger.log(
        `Cleaning up ${oldPendingPayments.length} old pending payment(s)`,
      );

      for (const payment of oldPendingPayments) {
        try {
          await this.markPaymentAsFailed(
            payment,
            "Payment timeout - exceeded maximum age",
          );
          this.logger.log(
            `Payment ${payment.id} marked as failed due to timeout - Purchase ${payment.purchaseId || "N/A"}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to cleanup payment ${payment.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in cleanupOldPendingPayments: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get pending payments that are within the time limit for checking
   */
  private async getPendingPaymentsWithinTimeLimit(): Promise<Payment[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - this.maxPaymentAgeMinutes);

    return await this.paymentRepository.find({
      where: {
        status: PaymentStatus.PENDING,
        type: PaymentType.TIP_PURCHASE,
        createdAt: MoreThan(cutoffTime),
      },
      relations: ["purchase", "paymentGateway"],
    });
  }

  /**
   * Check payment status with the gateway and update if completed
   */
  private async checkAndUpdatePaymentStatus(payment: Payment): Promise<void> {
    if (!payment.paymentGatewayId || !payment.providerTransactionId) {
      this.logger.warn(
        `Payment ${payment.id} missing gateway or transaction ID, skipping`,
      );
      return;
    }

    try {
      // Get the payment gateway
      const paymentGateway = await this.paymentGatewayRepository.findOne({
        where: { id: payment.paymentGatewayId },
      });

      if (!paymentGateway) {
        this.logger.warn(`Payment gateway not found for payment ${payment.id}`);
        return;
      }

      // Check if gateway is active
      if (paymentGateway.status !== PaymentGatewayStatus.ACTIVE) {
        this.logger.warn(
          `Payment gateway ${paymentGateway.name} is inactive for payment ${payment.id}`,
        );
        return;
      }

      // Get gateway ID from gateway name (normalize to lowercase)
      const gatewayId = paymentGateway.name.toLowerCase();

      // Use the payment gateway registry to check status
      const statusRequest: PaymentStatusRequest = {
        transactionId: payment.providerTransactionId,
        paymentId: payment.id,
      };

      const statusResult =
        await this.paymentGatewayRegistryService.checkPaymentStatus(
          gatewayId,
          statusRequest,
        );

      if (statusResult.success) {
        const gatewayStatus = statusResult.status?.toLowerCase();

        // If payment is completed, update the payment and purchase
        if (gatewayStatus === "completed") {
          await this.updatePaymentAndPurchaseOnCompletion(
            payment,
            statusResult,
          );
        } else if (
          gatewayStatus === "failed" ||
          gatewayStatus === "cancelled"
        ) {
          await this.markPaymentAsFailed(
            payment,
            `Payment ${gatewayStatus} by gateway`,
          );
        }
      } else {
        this.logger.warn(
          `Failed to get status for payment ${payment.id}: ${statusResult.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error checking payment ${payment.id} status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update payment and purchase when payment is completed
   */
  private async updatePaymentAndPurchaseOnCompletion(
    payment: Payment,
    statusResult: any,
  ): Promise<void> {
    try {
      // Refresh payment from database to get latest notification status
      const refreshedPayment = await this.paymentRepository.findOne({
        where: { id: payment.id },
        relations: ["purchase", "globalPaymentMethod"],
      });

      if (!refreshedPayment) {
        this.logger.error(`Payment ${payment.id} not found after refresh`);
        return;
      }

      // Check if payment is already completed and notifications sent
      if (
        refreshedPayment.status === PaymentStatus.COMPLETED &&
        refreshedPayment.emailNotificationSent &&
        refreshedPayment.webhookNotificationSent
      ) {
        this.logger.debug(
          `Payment ${payment.id} already completed with notifications sent, skipping`,
        );
        return;
      }

      // Update payment status only if not already completed
      if (refreshedPayment.status !== PaymentStatus.COMPLETED) {
        refreshedPayment.status = PaymentStatus.COMPLETED;
        refreshedPayment.providerStatus = statusResult.status;
        refreshedPayment.providerProcessedAt = new Date();
        await this.paymentRepository.save(refreshedPayment);
      }

      // Update purchase status if purchase exists
      if (refreshedPayment.purchaseId) {
        const purchase = await this.purchaseRepository.findOne({
          where: { id: refreshedPayment.purchaseId },
        });

        if (purchase && purchase.status !== PurchaseStatusType.COMPLETED) {
          purchase.status = PurchaseStatusType.COMPLETED;
          await this.purchaseRepository.save(purchase);

          // Create escrow for completed purchase
          try {
            await this.escrowService.createEscrowForPurchase(purchase.id);
            this.logger.log(
              `Created escrow for purchase ${purchase.id} after payment completion`,
            );
          } catch (escrowError) {
            // Log error but don't fail the payment completion
            this.logger.error(
              `Failed to create escrow for purchase ${purchase.id}: ${escrowError.message}`,
              escrowError.stack,
            );
          }
        }
      }

      this.logger.log(
        `Payment ${payment.id} completed - Purchase ${payment.purchaseId || "N/A"} marked as completed`,
      );

      // Send notifications if not already sent
      await this.sendNotificationsIfNeeded(refreshedPayment);
    } catch (error) {
      this.logger.error(
        `Failed to update payment ${payment.id} on completion: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark payment as failed and update corresponding purchase status
   */
  private async markPaymentAsFailed(
    payment: Payment,
    reason: string,
  ): Promise<void> {
    try {
      payment.status = PaymentStatus.FAILED;
      payment.providerStatus = "failed";
      payment.providerProcessedAt = new Date();
      payment.errorMessage = reason;

      await this.paymentRepository.save(payment);

      // Update purchase status to failed if purchase exists
      if (payment.purchaseId) {
        const purchase = await this.purchaseRepository.findOne({
          where: { id: payment.purchaseId },
        });

        if (purchase && purchase.status !== PurchaseStatusType.FAILED) {
          purchase.status = PurchaseStatusType.FAILED;
          await this.purchaseRepository.save(purchase);

          this.logger.log(
            `Updated purchase ${purchase.id} status to failed due to payment failure: ${reason}`,
          );
        }
      }

      this.logger.log(
        `Payment ${payment.id} marked as failed: ${reason} - Purchase ${payment.purchaseId || "N/A"} marked as failed`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to mark payment ${payment.id} as failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send email and webhook notifications if not already sent
   */
  private async sendNotificationsIfNeeded(payment: Payment): Promise<void> {
    try {
      // Load purchase with buyer and tip relationships
      const purchase = await this.purchaseRepository.findOne({
        where: { id: payment.purchaseId },
        relations: ["buyer", "tip"],
      });

      if (!purchase || !purchase.buyer) {
        this.logger.error(`Purchase not found for payment ${payment.id}`);
        return;
      }

      // Load payment with globalPaymentMethod if needed
      const paymentWithMethod = await this.paymentRepository.findOne({
        where: { id: payment.id },
        relations: ["globalPaymentMethod"],
      });

      if (paymentWithMethod) {
        payment.globalPaymentMethod = paymentWithMethod.globalPaymentMethod;
      }

      const buyerEmail = purchase.buyer.email;
      const buyerName =
        purchase.buyer.firstName && purchase.buyer.lastName
          ? `${purchase.buyer.firstName} ${purchase.buyer.lastName}`
          : purchase.buyer.displayName || purchase.buyer.firstName || "User";

      // Send email notification if not already sent
      if (!payment.emailNotificationSent) {
        try {
          await this.emailService.sendPaymentSuccessEmail(buyerEmail, {
            orderNumber: payment.orderNumber || purchase.id,
            amount: Number(payment.amount),
            paymentMethod: payment.globalPaymentMethod?.name || "Payment",
            customerName: buyerName,
          });

          await this.paymentRepository.update(payment.id, {
            emailNotificationSent: true,
            lastNotificationSentAt: new Date(),
          });

          this.logger.log(
            `Payment success email sent - Purchase ${purchase.id}, Customer: ${buyerEmail}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send user email notification: ${error.message}`,
            error.stack,
          );
        }
      }

      // Send admin webhook notification if not already sent
      if (!payment.webhookNotificationSent) {
        try {
          await this.sendAdminWebhookForCompletedPayment(purchase, payment);
        } catch (error) {
          this.logger.error(
            `Failed to send admin webhook notification: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notifications for payment ${payment.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send admin webhook notification for payment completion
   */
  private async sendAdminWebhookForCompletedPayment(
    purchase: Purchase,
    payment: Payment,
  ): Promise<void> {
    try {
      // Load purchase with buyer and tip relationships
      const purchaseWithRelations = await this.purchaseRepository.findOne({
        where: { id: purchase.id },
        relations: ["buyer", "tip"],
      });

      if (!purchaseWithRelations || !purchaseWithRelations.buyer) {
        this.logger.error(
          `Purchase or buyer not found for payment ${payment.id}`,
        );
        return;
      }

      // Prepare webhook payload
      const webhookPayload = {
        orderId: purchase.id,
        customerId: purchaseWithRelations.buyer.id,
        totalAmount: Number(payment.amount),
        currency: payment.currency,
        status: purchase.status,
        paymentStatus: "paid",
        items: [
          {
            productId: purchaseWithRelations.tip.id,
            productName: purchaseWithRelations.tip.title || "Tip/Prediction",
            quantity: 1,
            unitPrice: Number(payment.amount),
            totalPrice: Number(payment.amount),
          },
        ],
        orderDate: purchase.createdAt.toISOString(),
        customerEmail: purchaseWithRelations.buyer.email,
        customerName:
          purchaseWithRelations.buyer.firstName &&
          purchaseWithRelations.buyer.lastName
            ? `${purchaseWithRelations.buyer.firstName} ${purchaseWithRelations.buyer.lastName}`
            : purchaseWithRelations.buyer.displayName || undefined,
        notes: `Purchase payment completed via cron job - Transaction: ${payment.providerTransactionId}, Tip: ${purchaseWithRelations.tip.id}`,
      };

      // Send webhook with retry logic
      const success = await this.webhookService.retryWebhook(
        () => this.webhookService.sendOrderNotification(webhookPayload),
        3, // max retries
        1000, // base delay
      );

      if (success) {
        await this.paymentRepository.update(payment.id, {
          webhookNotificationSent: true,
          lastNotificationSentAt: new Date(),
        });

        this.logger.log(
          `Payment completion webhook sent - Purchase ${purchase.id}`,
        );
      } else {
        this.logger.error(
          `Failed to send payment completion webhook for purchase ${purchase.id} after retries`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send admin webhook for completed payment: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get statistics about pending payments (for monitoring/debugging)
   */
  async getPendingPaymentsStats(): Promise<{
    totalPending: number;
    withinTimeLimit: number;
    oldPending: number;
  }> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - this.maxPaymentAgeMinutes);

    const [totalPending, withinTimeLimit, oldPending] = await Promise.all([
      this.paymentRepository.count({
        where: {
          status: PaymentStatus.PENDING,
          type: PaymentType.TIP_PURCHASE,
        },
      }),
      this.paymentRepository.count({
        where: {
          status: PaymentStatus.PENDING,
          type: PaymentType.TIP_PURCHASE,
          createdAt: MoreThan(cutoffTime),
        },
      }),
      this.paymentRepository.count({
        where: {
          status: PaymentStatus.PENDING,
          type: PaymentType.TIP_PURCHASE,
          createdAt: LessThan(cutoffTime),
        },
      }),
    ]);

    return {
      totalPending,
      withinTimeLimit,
      oldPending,
    };
  }
}
