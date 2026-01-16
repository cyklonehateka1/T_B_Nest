import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

export enum DeletedUserStatus {
  DELETED = 'deleted',
  RESTORED = 'restored',
}

export enum DeletionReason {
  USER_REQUESTED = 'user_requested',
  ADMIN_DELETED = 'admin_deleted',
  VIOLATION = 'violation',
  INACTIVE = 'inactive',
}

@Entity('deleted_users')
export class DeletedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  @IsString()
  firstName: string;

  @Column()
  @IsString()
  lastName: string;

  @Column({ select: false })
  @Exclude()
  @IsString()
  password: string;

  @Column({
    type: 'enum',
    enum: DeletedUserStatus,
    enumName: 'deleted_user_status',
    default: DeletedUserStatus.DELETED,
  })
  @IsEnum(DeletedUserStatus)
  status: DeletedUserStatus;

  @Column({
    type: 'enum',
    enum: DeletionReason,
    enumName: 'deletion_reason',
    default: DeletionReason.USER_REQUESTED,
  })
  @IsEnum(DeletionReason)
  deletionReason: DeletionReason;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  country: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  imagePath: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  referralCode: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  dateRegistered: string;

  @Column({ nullable: true, type: 'varchar' })
  @IsOptional()
  @IsString()
  otp: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  otpExpiry: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  pendingNewEmail: string | null;

  @Column({ type: 'jsonb', nullable: true })
  notificationPreferences: Record<string, boolean> | null;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  refreshToken: string;

  // Original user creation and update timestamps
  @Column()
  originalCreatedAt: Date;

  @Column()
  originalUpdatedAt: Date;

  // Deletion timestamp
  @CreateDateColumn()
  deletedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
