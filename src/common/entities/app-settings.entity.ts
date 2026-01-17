import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
@Entity("app_settings")
@Index("idx_app_settings_is_active", ["isActive"])
export class AppSettings {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({
    name: "tip_min_price",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 1.0,
  })
  tipMinPrice: number;
  @Column({
    name: "tip_max_price",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 100.0,
  })
  tipMaxPrice: number;
  @Column({
    name: "platform_commission_rate",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: false,
    default: 0.1,
    comment: "Platform commission rate (e.g., 0.1 = 10%)",
  })
  platformCommissionRate: number;
  @Column({
    name: "tipster_commission_rate",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: false,
    default: 0.9,
    comment: "Tipster commission rate (e.g., 0.9 = 90%)",
  })
  tipsterCommissionRate: number;
  @Column({
    name: "max_selections_per_tip",
    type: "integer",
    nullable: false,
    default: 50,
    comment: "Maximum number of selections allowed per tip",
  })
  maxSelectionsPerTip: number;
  @Column({
    name: "max_tips_per_day",
    type: "integer",
    nullable: true,
    comment:
      "Maximum number of tips a tipster can create per day (null = unlimited)",
  })
  maxTipsPerDay?: number;
  @Column({
    name: "max_tips_per_user",
    type: "integer",
    nullable: true,
    comment:
      "Maximum number of tips a user can purchase per day (null = unlimited)",
  })
  maxTipsPerUser?: number;
  @Column({
    name: "withdrawal_processing_days",
    type: "integer",
    nullable: false,
    default: 3,
    comment: "Number of business days to process withdrawal",
  })
  withdrawalProcessingDays: number;
  @Column({
    name: "enable_tip_purchases",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Enable/disable tip purchases globally",
  })
  enableTipPurchases: boolean;
  @Column({
    name: "enable_new_tipster_registrations",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Enable/disable new tipster account registrations",
  })
  enableNewTipsterRegistrations: boolean;
  @Column({
    name: "enable_free_tips",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Allow tipsters to create free tips (price = 0)",
  })
  enableFreeTips: boolean;
  @Column({
    name: "require_tip_approval",
    type: "boolean",
    nullable: false,
    default: false,
    comment: "Require admin approval before tips are published",
  })
  requireTipApproval: boolean;
  @Column({
    name: "auto_publish_tips",
    type: "boolean",
    nullable: false,
    default: true,
    comment:
      "Automatically publish tips when created (if not requiring approval)",
  })
  autoPublishTips: boolean;
  @Column({
    name: "send_email_notifications",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Send email notifications for important events",
  })
  sendEmailNotifications: boolean;
  @Column({
    name: "send_tip_purchase_notifications",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Send notifications when tips are purchased",
  })
  sendTipPurchaseNotifications: boolean;
  @Column({
    name: "maintenance_mode",
    type: "boolean",
    nullable: false,
    default: false,
    comment: "Enable maintenance mode (blocks non-admin access)",
  })
  maintenanceMode: boolean;
  @Column({
    name: "maintenance_message",
    type: "text",
    nullable: true,
    comment: "Message to display during maintenance mode",
  })
  maintenanceMessage?: string;
  @Column({
    name: "enable_analytics",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Enable analytics tracking",
  })
  enableAnalytics: boolean;
  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Additional flexible settings stored as key-value pairs",
  })
  metadata?: Record<string, any>;
  @Column({
    name: "is_active",
    type: "boolean",
    nullable: false,
    default: true,
    comment: "Whether these settings are currently active",
  })
  isActive: boolean;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "updated_by",
    foreignKeyConstraintName: "fk_app_settings_updated_by",
  })
  updatedBy?: User;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
