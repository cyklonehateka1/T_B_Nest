import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsObject,
} from "class-validator";
import { Purchase } from "./purchase.entity";
import { GlobalPaymentMethod } from "./global-payment-method.entity";
import { PaymentGateway } from "./payment-gateway.entity";

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// TypeScript interfaces for better type safety
export interface PaymentCallbackData {
  transactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  signature?: string;
}

export interface PaymentResponseData {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  errors?: string[];
  transactionId?: string;
  reference?: string;
  encryptedData?: string; // Encrypted sensitive data for secure storage
  webhookHash?: string; // Webhook hash for idempotency checking
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Purchase, { nullable: true })
  @JoinColumn({ name: "purchaseId" })
  purchase?: Purchase;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  purchaseId?: string;

  @Column()
  @IsString()
  orderNumber: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  @IsNumber()
  amount: number;

  // Relationship to GlobalPaymentMethod instead of hardcoded enum
  @ManyToOne(() => GlobalPaymentMethod, { nullable: false })
  @JoinColumn({ name: "globalPaymentMethodId" })
  globalPaymentMethod: GlobalPaymentMethod;

  @Column()
  @IsString()
  globalPaymentMethodId: string;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  paymentReference: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  providerReference?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  providerStatus?: string;

  // Relationship to PaymentGateway instead of hardcoded string
  @ManyToOne(() => PaymentGateway, { nullable: true })
  @JoinColumn({ name: "paymentGatewayId" })
  paymentGateway: PaymentGateway;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  paymentGatewayId?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  checkoutUrl?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  network?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  accountName?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @Column({ type: "jsonb", nullable: true })
  @IsOptional()
  @IsObject()
  callbackData: PaymentCallbackData;

  @Column({ type: "jsonb", nullable: true })
  @IsOptional()
  @IsObject()
  responseData: PaymentResponseData;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @Column({ nullable: true })
  @IsOptional()
  providerProcessedAt?: Date;

  @Column({ default: "GHS" })
  @IsString()
  currency: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  reason: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @Column({ nullable: true })
  @IsOptional()
  lastRetryAt?: Date;

  // Notification tracking fields
  @Column({ default: false })
  @IsOptional()
  emailNotificationSent?: boolean;

  @Column({ default: false })
  @IsOptional()
  webhookNotificationSent?: boolean;

  @Column({ nullable: true })
  @IsOptional()
  lastNotificationSentAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
