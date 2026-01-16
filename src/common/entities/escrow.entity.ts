import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Purchase } from "./purchase.entity";
import { User } from "./user.entity";
import { EscrowStatusType } from "../enums/escrow-status-type.enum";

@Entity("escrow")
@Index("idx_escrow_purchase_id", ["purchase"])
@Index("idx_escrow_status", ["status"])
@Index("idx_escrow_is_ai_tip", ["isAiTip"])
@Index("idx_escrow_held_at", ["heldAt"])
@Index("idx_escrow_released_at", ["releasedAt"])
@Unique("uk_escrow_purchase", ["purchase"])
export class Escrow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Purchase, { nullable: false })
  @JoinColumn({
    name: "purchase_id",
    foreignKeyConstraintName: "fk_escrow_purchase",
  })
  purchase: Purchase;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({
    type: "enum",
    enum: EscrowStatusType,
    enumName: "escrow_status_type",
    nullable: false,
    default: EscrowStatusType.PENDING,
  })
  status: EscrowStatusType;

  @Column({
    name: "is_ai_tip",
    type: "boolean",
    nullable: false,
    default: false,
  })
  isAiTip: boolean;

  @Column({ name: "held_at", type: "timestamptz", nullable: true })
  heldAt?: Date;

  @Column({ name: "released_at", type: "timestamptz", nullable: true })
  releasedAt?: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "released_to",
    foreignKeyConstraintName: "fk_escrow_released_to",
  })
  releasedTo?: User;

  @Column({ name: "release_type", type: "varchar", length: 20, nullable: true })
  releaseType?: string;

  @Column({
    name: "platform_fee",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  platformFee: number;

  @Column({
    name: "platform_fee_percentage",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  platformFeePercentage: number;

  @Column({
    name: "tipster_earnings",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  tipsterEarnings: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
