import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { UserStatus } from "../enums/user-status.enum";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { UserRole } from "./user-role.entity";
import * as bcrypt from "bcrypt";
import { BeforeInsert, BeforeUpdate } from "typeorm";
@Entity("users")
@Index("idx_users_email", ["email"])
@Index("idx_users_display_name", ["displayName"])
@Index("idx_users_is_active", ["isActive"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "varchar", length: 255, unique: true, nullable: false })
  email: string;
  @Column({
    name: "password_hash",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  passwordHash: string;
  @Column({ name: "first_name", type: "varchar", length: 100, nullable: true })
  firstName?: string;
  @Column({ name: "last_name", type: "varchar", length: 100, nullable: true })
  lastName?: string;
  @Column({
    name: "display_name",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  displayName?: string;
  @Column({ name: "phone_number", type: "varchar", length: 20, nullable: true })
  phoneNumber?: string;
  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl?: string;
  @OneToMany(() => UserRole, (userRole) => userRole.user, { eager: false })
  userRoles?: UserRole[];
  @Column({
    name: "is_active",
    type: "boolean",
    nullable: false,
    default: true,
  })
  isActive: boolean;
  @Column({
    type: "enum",
    enum: UserStatus,
    enumName: "user_status",
    default: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus)
  status: UserStatus;
  @Column({
    name: "is_verified",
    type: "boolean",
    nullable: false,
    default: false,
  })
  isVerified: boolean;
  @Column({ name: "email_verified_at", type: "timestamptz", nullable: true })
  emailVerifiedAt?: Date;
  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt?: Date;
  @Column({ name: "otp", nullable: true, type: "varchar" })
  @IsOptional()
  @IsString()
  otp: string | null;
  @Column({ name: "otp_expiry", nullable: true, type: "timestamp" })
  otpExpiry: Date | null;
  @Column({ name: "pending_new_email", nullable: true, type: "varchar" })
  pendingNewEmail: string | null;
  @Column({ name: "notification_preferences", type: "jsonb", nullable: true })
  notificationPreferences: Record<string, boolean> | null;
  @Column({ name: "two_factor_enabled", default: false })
  isTwoFactorEnabled: boolean;
  @Column({ name: "two_factor_secret", nullable: true, type: "varchar" })
  twoFactorSecret: string | null;
  @Column({ name: "two_factor_enabled_at", nullable: true, type: "timestamp" })
  twoFactorEnabledAt: Date | null;
  @Column({ name: "two_factor_backup_codes", type: "jsonb", nullable: true })
  twoFactorBackupCodes: string[] | null;
  @Column({
    name: "account_number",
    type: "varchar",
    length: 50,
    nullable: true,
    unique: true,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;
  @Column({
    name: "account_name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  accountName?: string;
  @Column({ name: "bank_code", type: "varchar", length: 50, nullable: true })
  @IsOptional()
  @IsString()
  bankCode?: string;
  @Column({ name: "bank_name", type: "varchar", length: 255, nullable: true })
  @IsOptional()
  @IsString()
  bankName?: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith("$2")) {
      const saltRounds = 12;
      this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    }
  }
  async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.passwordHash);
  }
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
