import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("temporary_sessions")
@Index(["token"], { unique: true })
@Index(["userId"])
@Index(["expiresAt"])
export class TemporarySession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 255, unique: true })
  token: string;

  @Column({ type: "timestamp with time zone" })
  expiresAt: Date;

  @Column({ type: "varchar", length: 50, default: "PENDING_2FA" })
  status: "PENDING_2FA" | "COMPLETED" | "EXPIRED";

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt?: Date;

  // Helper method to check if session is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Helper method to check if session is valid for 2FA
  isValidFor2FA(): boolean {
    return this.status === "PENDING_2FA" && !this.isExpired();
  }
}
