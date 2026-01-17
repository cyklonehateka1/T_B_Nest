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
import { Tip } from "./tip.entity";
import { Purchase } from "./purchase.entity";
import { ReportType } from "../enums/report-type.enum";
import { ReportStatusType } from "../enums/report-status-type.enum";

@Entity("reports")
@Index("idx_reports_reported_by", ["reportedBy"])
@Index("idx_reports_status", ["status"])
@Index("idx_reports_type", ["type"])
@Index("idx_reports_created_at", ["createdAt"])
export class Report {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "reported_by",
    foreignKeyConstraintName: "fk_reports_reported_by",
  })
  reportedBy: User;

  @Column({
    type: "enum",
    enum: ReportType,
    enumName: "report_type",
    nullable: false,
  })
  type: ReportType;

  @Column({
    type: "enum",
    enum: ReportStatusType,
    enumName: "report_status_type",
    nullable: false,
    default: ReportStatusType.PENDING,
  })
  status: ReportStatusType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "reported_user_id",
    foreignKeyConstraintName: "fk_reports_reported_user",
  })
  reportedUser?: User;

  @ManyToOne(() => Tip, { nullable: true })
  @JoinColumn({
    name: "reported_tip_id",
    foreignKeyConstraintName: "fk_reports_reported_tip",
  })
  reportedTip?: Tip;

  @ManyToOne(() => Purchase, { nullable: true })
  @JoinColumn({
    name: "reported_purchase_id",
    foreignKeyConstraintName: "fk_reports_reported_purchase",
  })
  reportedPurchase?: Purchase;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "text", nullable: false })
  description: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "resolved_by",
    foreignKeyConstraintName: "fk_reports_resolved_by",
  })
  resolvedBy?: User;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt?: Date;

  @Column({ name: "resolution_notes", type: "text", nullable: true })
  resolutionNotes?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
