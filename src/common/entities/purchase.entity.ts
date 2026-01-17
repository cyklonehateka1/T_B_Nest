import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Tip } from "./tip.entity";
import { User } from "./user.entity";
import { PurchaseStatusType } from "../enums/purchase-status-type.enum";
import { TipStatusType } from "../enums/tip-status-type.enum";

@Entity("purchases")
@Index("idx_purchases_tip_id", ["tip"])
@Index("idx_purchases_buyer_id", ["buyer"])
@Index("idx_purchases_status", ["status"])
@Index("idx_purchases_purchased_at", ["purchasedAt"])
@Index("idx_purchases_tip_outcome", ["tipOutcome"])
@Unique("uk_purchases_tip_buyer", ["tip", "buyer"])
export class Purchase {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tip, { nullable: false })
  @JoinColumn({ name: "tip_id", foreignKeyConstraintName: "fk_purchases_tip" })
  tip: Tip;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "buyer_id",
    foreignKeyConstraintName: "fk_purchases_buyer",
  })
  buyer: User;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({
    type: "enum",
    enum: PurchaseStatusType,
    enumName: "purchase_status_type",
    nullable: false,
    default: PurchaseStatusType.PENDING,
  })
  status: PurchaseStatusType;

  @Column({
    name: "payment_reference",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  paymentReference?: string;

  @Column({
    name: "payment_method",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  paymentMethod?: string;

  @Column({
    name: "payment_gateway",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  paymentGateway?: string;

  @Column({
    name: "tip_outcome",
    type: "enum",
    enum: TipStatusType,
    enumName: "tip_status_type",
    nullable: true,
  })
  tipOutcome?: TipStatusType;

  @Column({ name: "refunded_at", type: "timestamptz", nullable: true })
  refundedAt?: Date;

  @Column({ name: "refund_reason", type: "text", nullable: true })
  refundReason?: string;

  @Column({ name: "purchased_at", type: "timestamptz", nullable: false })
  purchasedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
