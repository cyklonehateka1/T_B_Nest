import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Tipster } from "./tipster.entity";
import { Purchase } from "./purchase.entity";
import { Escrow } from "./escrow.entity";
import { TransactionType } from "../enums/transaction-type.enum";
import { TransactionStatusType } from "../enums/transaction-status-type.enum";

@Entity("transactions")
@Index("idx_transactions_user_id", ["user"])
@Index("idx_transactions_tipster_id", ["tipster"])
@Index("idx_transactions_type", ["type"])
@Index("idx_transactions_status", ["status"])
@Index("idx_transactions_purchase_id", ["purchase"])
@Index("idx_transactions_created_at", ["createdAt"])
@Index("idx_transactions_user_type", ["user", "type"])
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "fk_transactions_user",
  })
  user?: User;

  @ManyToOne(() => Tipster, { nullable: true })
  @JoinColumn({
    name: "tipster_id",
    foreignKeyConstraintName: "fk_transactions_tipster",
  })
  tipster?: Tipster;

  @Column({
    type: "enum",
    enum: TransactionType,
    enumName: "transaction_type",
    nullable: false,
  })
  type: TransactionType;

  @Column({
    type: "enum",
    enum: TransactionStatusType,
    enumName: "transaction_status_type",
    nullable: false,
    default: TransactionStatusType.PENDING,
  })
  status: TransactionStatusType;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ type: "varchar", length: 3, nullable: false, default: "GHS" })
  currency: string;

  @ManyToOne(() => Purchase, { nullable: true })
  @JoinColumn({
    name: "purchase_id",
    foreignKeyConstraintName: "fk_transactions_purchase",
  })
  purchase?: Purchase;

  @ManyToOne(() => Escrow, { nullable: true })
  @JoinColumn({
    name: "escrow_id",
    foreignKeyConstraintName: "fk_transactions_escrow",
  })
  escrow?: Escrow;

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

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: "processed_at", type: "timestamptz", nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
