import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { NotificationType } from "../enums/notification-type.enum";
@Entity("notifications")
@Index("idx_notifications_user_id", ["user"])
@Index("idx_notifications_is_read", ["isRead"])
@Index("idx_notifications_type", ["type"])
@Index("idx_notifications_created_at", ["createdAt"])
@Index("idx_notifications_user_unread", ["user", "isRead"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "fk_notifications_user",
  })
  user: User;
  @Column({
    type: "enum",
    enum: NotificationType,
    enumName: "notification_type",
    nullable: false,
  })
  type: NotificationType;
  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;
  @Column({ type: "text", nullable: false })
  message: string;
  @Column({ name: "is_read", type: "boolean", nullable: false, default: false })
  isRead: boolean;
  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt?: Date;
  @Column({ name: "reference_id", type: "uuid", nullable: true })
  referenceId?: string;
  @Column({
    name: "reference_type",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  referenceType?: string;
  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
