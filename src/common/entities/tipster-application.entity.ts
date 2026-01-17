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
@Entity("tipster_applications")
@Index("idx_tipster_applications_user_id", ["user"])
@Index("idx_tipster_applications_status", ["status"])
@Index("idx_tipster_applications_submitted_at", ["submittedAt"])
export class TipsterApplication {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "fk_tipster_applications_user",
  })
  user: User;
  @Column({ type: "varchar", length: 20, nullable: false, default: "pending" })
  status: string;
  @Column({ name: "identity_document_url", type: "text", nullable: true })
  identityDocumentUrl?: string;
  @Column({
    name: "identity_document_type",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  identityDocumentType?: string;
  @Column({ name: "proof_of_address_url", type: "text", nullable: true })
  proofOfAddressUrl?: string;
  @Column({
    name: "payout_method",
    type: "varchar",
    length: 50,
    nullable: false,
  })
  payoutMethod: string;
  @Column({ name: "payout_details", type: "jsonb", nullable: false })
  payoutDetails: Record<string, any>;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "reviewed_by",
    foreignKeyConstraintName: "fk_tipster_applications_reviewed_by",
  })
  reviewedBy?: User;
  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt?: Date;
  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason?: string;
  @Column({ type: "text", nullable: true })
  notes?: string;
  @Column({ name: "submitted_at", type: "timestamptz", nullable: false })
  submittedAt: Date;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
