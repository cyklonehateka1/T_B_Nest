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

@Entity("tipsters")
@Index("idx_tipsters_user_id", ["user"])
@Index("idx_tipsters_is_ai", ["isAi"])
@Index("idx_tipsters_is_verified", ["isVerified"])
@Index("idx_tipsters_kyc_status", ["kycStatus"])
@Index("idx_tipsters_rating", ["rating"])
@Index("idx_tipsters_success_rate", ["successRate"])
export class Tipster {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "fk_tipsters_user" })
  user?: User;

  @Column({ name: "is_ai", type: "boolean", nullable: false, default: false })
  isAi: boolean;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl?: string;

  @Column({
    name: "is_verified",
    type: "boolean",
    nullable: false,
    default: false,
  })
  isVerified: boolean;

  @Column({
    name: "is_active",
    type: "boolean",
    nullable: false,
    default: true,
  })
  isActive: boolean;

  @Column({ name: "total_tips", type: "integer", nullable: false, default: 0 })
  totalTips: number;

  @Column({
    name: "successful_tips",
    type: "integer",
    nullable: false,
    default: 0,
  })
  successfulTips: number;

  @Column({
    name: "total_earnings",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalEarnings: number;

  @Column({
    name: "success_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  successRate: number;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  rating: number;

  @Column({
    name: "kyc_status",
    type: "varchar",
    length: 20,
    nullable: true,
    default: "not_applied",
  })
  kycStatus?: string;

  @Column({ name: "kyc_submitted_at", type: "timestamptz", nullable: true })
  kycSubmittedAt?: Date;

  @Column({ name: "kyc_approved_at", type: "timestamptz", nullable: true })
  kycApprovedAt?: Date;

  @Column({ name: "kyc_rejected_at", type: "timestamptz", nullable: true })
  kycRejectedAt?: Date;

  @Column({ name: "kyc_rejection_reason", type: "text", nullable: true })
  kycRejectionReason?: string;

  @Column({
    name: "payout_method",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  payoutMethod?: string;

  @Column({ name: "payout_details", type: "jsonb", nullable: true })
  payoutDetails?: Record<string, any>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
