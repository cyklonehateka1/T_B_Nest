import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Cron } from "@nestjs/schedule";
import { Escrow } from "../../common/entities/escrow.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { Tip } from "../../common/entities/tip.entity";
import { Payment } from "../../common/entities/payment.entity";
import { AppSettings } from "../../common/entities/app-settings.entity";
import { EscrowStatusType } from "../../common/enums/escrow-status-type.enum";
import { PurchaseStatusType } from "../../common/enums/purchase-status-type.enum";
import { TipStatusType } from "../../common/enums/tip-status-type.enum";
import { PaymentType } from "../../common/enums/payment-type.enum";
import { PaymentStatus } from "../../common/entities/payment.entity";
import { PalmpayService } from "../payments/gateways/palmpay/palmpay.service";

@Injectable()
export class EscrowSettlementScheduler implements OnModuleInit {
  private readonly logger = new Logger(EscrowSettlementScheduler.name);

  private readonly cronEnabled: boolean;
  private readonly settlementEnabled: boolean;

  constructor(
    @InjectRepository(Escrow)
    private readonly escrowRepository: Repository<Escrow>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(AppSettings)
    private readonly appSettingsRepository: Repository<AppSettings>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly palmpayService: PalmpayService,
  ) {
    this.cronEnabled =
      this.configService.get<string>("TIP_EVALUATION_CRON_ENABLED") === "true";
    this.settlementEnabled =
      this.configService.get<string>("ESCROW_SETTLEMENT_ENABLED") === "true";
  }

  onModuleInit() {
    this.logger.log("=== EscrowSettlementScheduler Initialization ===");
    this.logger.log(`TIP_EVALUATION_CRON_ENABLED: ${this.cronEnabled}`);
    this.logger.log(`ESCROW_SETTLEMENT_ENABLED: ${this.settlementEnabled}`);

    if (!this.cronEnabled) {
      this.logger.warn(
        "Tip evaluation cron is disabled (TIP_EVALUATION_CRON_ENABLED=false). All cron jobs are deactivated.",
      );
    } else {
      if (this.settlementEnabled) {
        this.logger.log(
          "✓ Escrow settlement enabled - processing escrow payouts and refunds",
        );
        this.logger.log(
          `  Cron job will run every 30 minutes: @Cron("*/30 * * * *")`,
        );
      } else {
        this.logger.warn(
          "Escrow settlement is disabled (ESCROW_SETTLEMENT_ENABLED=false)",
        );
      }
    }
    this.logger.log(
      "=== EscrowSettlementScheduler Initialization Complete ===",
    );
  }

  /**
   * Process escrow settlements (payouts and refunds)
   * Runs every 30 minutes
   */
  @Cron("*/30 * * * *")
  async processEscrowSettlements(): Promise<void> {
    this.logger.debug(
      `[CRON] processEscrowSettlements called - cronEnabled: ${this.cronEnabled}, settlementEnabled: ${this.settlementEnabled}`,
    );

    if (!this.cronEnabled || !this.settlementEnabled) {
      this.logger.debug(
        "[CRON] processEscrowSettlements skipped - cron or settlement is disabled",
      );
      return;
    }

    this.logger.log("[CRON] Starting escrow settlement processing...");

    try {
      // Find escrow records ready for settlement:
      // - status is HELD (or PENDING if created on payment completion)
      // - Purchase is COMPLETED
      // - Tip status is not PENDING (WON, LOST, or VOID)
      const escrowsToSettle = await this.escrowRepository.find({
        where: [
          { status: EscrowStatusType.HELD },
          { status: EscrowStatusType.PENDING },
        ],
        relations: ["purchase", "purchase.tip", "purchase.buyer"],
      });

      if (escrowsToSettle.length === 0) {
        this.logger.debug("[CRON] No escrows found ready for settlement");
        return;
      }

      // Filter to only those with completed purchases and determined tip outcomes
      const readyEscrows = escrowsToSettle.filter(
        (escrow) =>
          escrow.purchase.status === PurchaseStatusType.COMPLETED &&
          escrow.purchase.tip &&
          escrow.purchase.tip.status !== TipStatusType.PENDING,
      );

      if (readyEscrows.length === 0) {
        this.logger.debug(
          "[CRON] No escrows ready for settlement (waiting for tip outcomes)",
        );
        return;
      }

      this.logger.log(
        `[CRON] Found ${readyEscrows.length} escrow(s) ready for settlement`,
      );

      // Get platform settings for fee calculation
      const appSettings = await this.appSettingsRepository.findOne({
        where: { isActive: true },
      });

      if (!appSettings) {
        this.logger.error(
          "[CRON] No active app settings found - cannot calculate fees",
        );
        return;
      }

      let processedCount = 0;
      let errorCount = 0;

      for (const escrow of readyEscrows) {
        try {
          await this.settleEscrow(escrow, appSettings);
          processedCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to settle escrow ${escrow.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `[CRON] Escrow settlement complete - Processed: ${processedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in processEscrowSettlements: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Settle a single escrow record
   */
  private async settleEscrow(
    escrow: Escrow,
    appSettings: AppSettings,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Refresh escrow with latest data including original payment for currency
      const refreshedEscrow = await queryRunner.manager.findOne(Escrow, {
        where: { id: escrow.id },
        relations: [
          "purchase",
          "purchase.tip",
          "purchase.tip.tipster",
          "purchase.tip.tipster.user",
          "purchase.buyer",
        ],
      });

      if (!refreshedEscrow) {
        throw new Error("Escrow not found");
      }

      // Get original payment to get currency
      const originalPayment = await queryRunner.manager.findOne(Payment, {
        where: {
          purchaseId: refreshedEscrow.purchase.id,
          type: PaymentType.TIP_PURCHASE,
        },
        order: { createdAt: "DESC" },
      });

      // Double-check tip status
      const tip = refreshedEscrow.purchase.tip;
      if (tip.status === TipStatusType.PENDING) {
        this.logger.debug(
          `Escrow ${escrow.id} - Tip ${tip.id} still pending, skipping`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      // Check if already settled
      if (
        refreshedEscrow.status === EscrowStatusType.RELEASED ||
        refreshedEscrow.status === EscrowStatusType.REFUNDED
      ) {
        this.logger.debug(
          `Escrow ${escrow.id} already settled (status: ${refreshedEscrow.status})`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      const isAiTip = tip.isAi || refreshedEscrow.isAiTip;
      const escrowAmount = parseFloat(refreshedEscrow.amount.toString());
      const platformFeePercentage =
        parseFloat(appSettings.platformCommissionRate.toString()) * 100; // Convert 0.1 to 10%

      // Get currency from original payment or default to USD
      const currency =
        originalPayment?.currency ||
        (refreshedEscrow.purchase.paymentGateway === "palmpay"
          ? "GHS"
          : "USD"); // Default for Palmpay

      // Get admin API base URL for webhook
      const adminApiBaseUrl =
        this.configService.get<string>("ADMIN_API_BASEURL") ||
        this.configService.get<string>("API_BASE_URL") ||
        "http://localhost:3000";

      let platformFee: number;
      let tipsterEarnings: number;
      let releaseType: string;
      let releasedTo: any;

      // Determine settlement based on tip outcome
      if (tip.status === TipStatusType.WON) {
        if (isAiTip) {
          // AI tip won - platform keeps all funds
          platformFee = escrowAmount;
          tipsterEarnings = 0;
          releaseType = "PLATFORM_REVENUE";
          releasedTo = null; // No user recipient

          refreshedEscrow.status = EscrowStatusType.RELEASED;
          refreshedEscrow.releasedAt = new Date();
          refreshedEscrow.releasedTo = undefined;
          refreshedEscrow.releaseType = releaseType;
          refreshedEscrow.platformFee = platformFee;
          refreshedEscrow.platformFeePercentage = 100.0;
          refreshedEscrow.tipsterEarnings = 0;

          // Create platform revenue payment record
          const platformPayment = queryRunner.manager.create(Payment, {
            type: PaymentType.PLATFORM_REVENUE,
            isPayout: false, // Money staying with platform
            escrow: refreshedEscrow,
            escrowId: refreshedEscrow.id,
            amount: escrowAmount,
            currency: currency,
            status: PaymentStatus.COMPLETED,
            paymentReference: `PLATFORM-REV-${refreshedEscrow.id.substring(0, 8)}`,
            description: `Platform revenue from AI tip ${tip.id} (escrow ${refreshedEscrow.id})`,
          });

          await queryRunner.manager.save(Payment, platformPayment);

          this.logger.log(
            `Escrow ${escrow.id} - AI tip WON: Platform keeps ${escrowAmount} (100%)`,
          );
        } else {
          // Regular tip won - split between platform and tipster
          platformFee =
            escrowAmount *
            parseFloat(appSettings.platformCommissionRate.toString());
          tipsterEarnings = escrowAmount - platformFee;
          releaseType = "TIPSTER_PAYOUT";
          releasedTo = tip.tipster.user;

          refreshedEscrow.status = EscrowStatusType.RELEASED;
          refreshedEscrow.releasedAt = new Date();
          refreshedEscrow.releasedTo = releasedTo;
          refreshedEscrow.releaseType = releaseType;
          refreshedEscrow.platformFee = platformFee;
          refreshedEscrow.platformFeePercentage = platformFeePercentage;
          refreshedEscrow.tipsterEarnings = tipsterEarnings;

          // Create tipster payout payment record
          const payoutPayment = queryRunner.manager.create(Payment, {
            type: PaymentType.TIPSTER_PAYOUT,
            isPayout: true, // Money going out
            escrow: refreshedEscrow,
            escrowId: refreshedEscrow.id,
            recipient: releasedTo,
            recipientUserId: releasedTo.id,
            amount: tipsterEarnings,
            currency: currency,
            status: PaymentStatus.PENDING, // Will be updated when payout completes
            paymentReference: `TIPSTER-PAYOUT-${refreshedEscrow.id.substring(0, 8)}`,
            description: `Tipster payout for tip ${tip.id} (escrow ${escrow.id})`,
          });

          const savedPayoutPayment = await queryRunner.manager.save(
            Payment,
            payoutPayment,
          );

          // Initiate actual payout to tipster's bank account
          if (
            releasedTo.accountNumber &&
            releasedTo.accountName &&
            (releasedTo.bankCode || releasedTo.bankName)
          ) {
            try {
              const payoutResult = await this.palmpayService.initiatePayout({
                orderId: savedPayoutPayment.paymentReference,
                amount: tipsterEarnings,
                currency: currency,
                recipient: {
                  accountNumber: releasedTo.accountNumber,
                  accountName: releasedTo.accountName,
                  bankCode: releasedTo.bankCode,
                  bankName: releasedTo.bankName,
                  phoneNumber: releasedTo.phoneNumber,
                },
                description: `Tipster payout for tip ${tip.id}`,
                notifyUrl: `${adminApiBaseUrl}/api/v1/payments/payout-webhook`,
              });

              if (payoutResult.success && payoutResult.orderNo) {
                // Update payment with provider transaction ID
                savedPayoutPayment.providerTransactionId = payoutResult.orderNo;
                savedPayoutPayment.providerStatus = "pending";
                await queryRunner.manager.save(Payment, savedPayoutPayment);

                this.logger.log(
                  `Payout initiated for tipster - Payment: ${savedPayoutPayment.id}, OrderNo: ${payoutResult.orderNo}`,
                );
              } else {
                this.logger.error(
                  `Failed to initiate payout for tipster: ${payoutResult.message}`,
                );
                // Payment remains in PENDING status, will be retried later
              }
            } catch (payoutError) {
              this.logger.error(
                `Error initiating tipster payout: ${payoutError.message}`,
                payoutError.stack,
              );
              // Payment remains in PENDING status, will be retried later
            }
          } else {
            this.logger.warn(
              `Cannot initiate payout for tipster ${releasedTo.id} - missing bank account details`,
            );
          }

          this.logger.log(
            `Escrow ${escrow.id} - Tip WON: Tipster earns ${tipsterEarnings}, Platform fee ${platformFee}`,
          );
        }
      } else if (
        tip.status === TipStatusType.LOST ||
        tip.status === TipStatusType.VOID
      ) {
        // Tip lost or void - refund to buyer
        releaseType = "BUYER_REFUND";
        releasedTo = refreshedEscrow.purchase.buyer;

        refreshedEscrow.status = EscrowStatusType.REFUNDED;
        refreshedEscrow.releasedAt = new Date();
        refreshedEscrow.releasedTo = releasedTo;
        refreshedEscrow.releaseType = releaseType;
        refreshedEscrow.platformFee = 0;
        refreshedEscrow.platformFeePercentage = 0;
        refreshedEscrow.tipsterEarnings = 0;

        // Create refund payment record
        const refundPayment = queryRunner.manager.create(Payment, {
          type: PaymentType.ESCROW_REFUND,
          isPayout: true, // Money going out (refund)
          purchase: refreshedEscrow.purchase,
          purchaseId: refreshedEscrow.purchase.id,
          escrow: refreshedEscrow,
          escrowId: refreshedEscrow.id,
          recipient: releasedTo,
          recipientUserId: releasedTo.id,
          amount: escrowAmount,
          currency: currency,
          status: PaymentStatus.PENDING, // Will be updated when refund completes
          paymentReference: `ESCROW-REFUND-${refreshedEscrow.id.substring(0, 8)}`,
          description: `Escrow refund for tip ${tip.id} (${tip.status}) - escrow ${escrow.id}`,
        });

        const savedRefundPayment = await queryRunner.manager.save(
          Payment,
          refundPayment,
        );

        // Initiate actual refund to buyer's bank account
        if (
          releasedTo.accountNumber &&
          releasedTo.accountName &&
          (releasedTo.bankCode || releasedTo.bankName)
        ) {
          try {
            const refundResult = await this.palmpayService.initiatePayout({
              orderId: savedRefundPayment.paymentReference,
              amount: escrowAmount,
              currency: currency,
              recipient: {
                accountNumber: releasedTo.accountNumber,
                accountName: releasedTo.accountName,
                bankCode: releasedTo.bankCode,
                bankName: releasedTo.bankName,
                phoneNumber: releasedTo.phoneNumber,
              },
              description: `Escrow refund for tip ${tip.id} (${tip.status})`,
              notifyUrl: `${adminApiBaseUrl}/api/v1/payments/payout-webhook`,
            });

            if (refundResult.success && refundResult.orderNo) {
              // Update payment with provider transaction ID
              savedRefundPayment.providerTransactionId = refundResult.orderNo;
              savedRefundPayment.providerStatus = "pending";
              await queryRunner.manager.save(Payment, savedRefundPayment);

              this.logger.log(
                `Refund initiated for buyer - Payment: ${savedRefundPayment.id}, OrderNo: ${refundResult.orderNo}`,
              );
            } else {
              this.logger.error(
                `Failed to initiate refund for buyer: ${refundResult.message}`,
              );
              // Payment remains in PENDING status, will be retried later
            }
          } catch (refundError) {
            this.logger.error(
              `Error initiating buyer refund: ${refundError.message}`,
              refundError.stack,
            );
            // Payment remains in PENDING status, will be retried later
          }
        } else {
          this.logger.warn(
            `Cannot initiate refund for buyer ${releasedTo.id} - missing bank account details`,
          );
        }

        this.logger.log(
          `Escrow ${escrow.id} - Tip ${tip.status}: Refunding ${escrowAmount} to buyer`,
        );
      }

      // Update escrow held_at if it was PENDING
      if (refreshedEscrow.heldAt === null) {
        refreshedEscrow.heldAt = new Date();
      }

      await queryRunner.manager.save(Escrow, refreshedEscrow);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Escrow ${escrow.id} settled successfully - Status: ${refreshedEscrow.status}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get statistics about escrow settlements (for monitoring/debugging)
   */
  async getSettlementStats(): Promise<{
    totalHeld: number;
    readyForSettlement: number;
    waitingForTipOutcome: number;
  }> {
    const totalHeld = await this.escrowRepository.count({
      where: [
        { status: EscrowStatusType.HELD },
        { status: EscrowStatusType.PENDING },
      ],
    });

    const escrows = await this.escrowRepository.find({
      where: [
        { status: EscrowStatusType.HELD },
        { status: EscrowStatusType.PENDING },
      ],
      relations: ["purchase", "purchase.tip"],
    });

    let readyCount = 0;
    let waitingCount = 0;

    for (const escrow of escrows) {
      if (
        escrow.purchase.status === PurchaseStatusType.COMPLETED &&
        escrow.purchase.tip &&
        escrow.purchase.tip.status !== TipStatusType.PENDING
      ) {
        readyCount++;
      } else {
        waitingCount++;
      }
    }

    return {
      totalHeld,
      readyForSettlement: readyCount,
      waitingForTipOutcome: waitingCount,
    };
  }
}
