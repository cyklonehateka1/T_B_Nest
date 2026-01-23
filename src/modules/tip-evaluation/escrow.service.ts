import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Escrow } from "../../common/entities/escrow.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { Tip } from "../../common/entities/tip.entity";
import { EscrowStatusType } from "../../common/enums/escrow-status-type.enum";
import { PurchaseStatusType } from "../../common/enums/purchase-status-type.enum";

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @InjectRepository(Escrow)
    private readonly escrowRepository: Repository<Escrow>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create an escrow record when a purchase payment is completed
   * @param purchaseId The purchase ID
   * @returns The created escrow record
   */
  async createEscrowForPurchase(purchaseId: string): Promise<Escrow> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if escrow already exists
      const existingEscrow = await queryRunner.manager.findOne(Escrow, {
        where: { purchase: { id: purchaseId } },
      });

      if (existingEscrow) {
        this.logger.debug(
          `Escrow already exists for purchase ${purchaseId}`,
        );
        await queryRunner.rollbackTransaction();
        return existingEscrow;
      }

      // Load purchase with tip
      const purchase = await queryRunner.manager.findOne(Purchase, {
        where: { id: purchaseId },
        relations: ["tip"],
      });

      if (!purchase) {
        throw new Error(`Purchase ${purchaseId} not found`);
      }

      if (purchase.status !== PurchaseStatusType.COMPLETED) {
        throw new Error(
          `Cannot create escrow for purchase ${purchaseId} - purchase status is ${purchase.status}`,
        );
      }

      // Load tip to check if it's AI-generated
      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: purchase.tip.id },
      });

      if (!tip) {
        throw new Error(`Tip ${purchase.tip.id} not found`);
      }

      // Create escrow record
      const escrow = queryRunner.manager.create(Escrow, {
        purchase: purchase,
        amount: purchase.amount,
        status: EscrowStatusType.HELD, // Start as HELD (funds held until tip outcome)
        isAiTip: tip.isAi,
        heldAt: new Date(),
        platformFee: 0,
        platformFeePercentage: 0,
        tipsterEarnings: 0,
      });

      const savedEscrow = await queryRunner.manager.save(Escrow, escrow);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Created escrow ${savedEscrow.id} for purchase ${purchaseId} (amount: ${purchase.amount}, AI tip: ${tip.isAi})`,
      );

      return savedEscrow;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create escrow for purchase ${purchaseId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get escrow by purchase ID
   */
  async getEscrowByPurchaseId(purchaseId: string): Promise<Escrow | null> {
    return await this.escrowRepository.findOne({
      where: { purchase: { id: purchaseId } },
      relations: ["purchase", "purchase.tip", "purchase.buyer"],
    });
  }
}
