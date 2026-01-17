import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
export enum NotificationType {
  NEW_ORDER = "new_order",
  CURRENCY_RATE_CHANGE = "currency_rate_change",
  DAILY_SUMMARY = "daily_summary",
}
@Entity("admin_notification_preferences")
export class AdminNotificationPreferences {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "uuid" })
  userId: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;
  @Column({
    type: "enum",
    enum: NotificationType,
    enumName: "notification_type",
  })
  notificationType: NotificationType;
  @Column({ default: true })
  enabled: boolean;
  @Column({ type: "jsonb", nullable: true })
  settings: {
    emailEnabled?: boolean;
    frequency?: "instant" | "daily" | "weekly";
    threshold?: number;
    time?: string;
  } | null;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
