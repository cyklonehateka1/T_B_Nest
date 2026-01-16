import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { GlobalPaymentMethod } from './global-payment-method.entity';

export enum PaymentGatewayStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

export enum PaymentMethodHandlingMode {
  CHECKOUT_URL = 'checkout_url', // Redirect user to gateway's checkout page
  DIRECT = 'direct', // Handle payment directly via API (no redirect)
}

/**
 * Maps payment method types to their handling mode for this gateway
 * Example: {
 *   "mobile_money": "checkout_url",
 *   "bank_transfer": "direct",
 *   "bank_card": "checkout_url"
 * }
 */
export type PaymentMethodHandling = Record<string, PaymentMethodHandlingMode>;

@Entity('payment_gateways')
export class PaymentGateway {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsString()
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @Column({
    type: 'enum',
    enum: PaymentGatewayStatus,
    enumName: 'payment_gateway_status',
    default: PaymentGatewayStatus.INACTIVE,
  })
  @IsEnum(PaymentGatewayStatus)
  status: PaymentGatewayStatus;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  configuration: any;

  /**
   * Payment method handling modes - determines how each payment method is processed
   * Key: payment method type (e.g., "mobile_money", "bank_transfer")
   * Value: handling mode ("checkout_url" or "direct")
   *
   * Example:
   * {
   *   "mobile_money": "checkout_url",  // User redirected to gateway checkout
   *   "bank_transfer": "direct",        // Payment handled directly via API
   *   "bank_card": "checkout_url"
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  paymentMethodHandling?: PaymentMethodHandling;

  @ManyToMany(() => GlobalPaymentMethod)
  @JoinTable({
    name: 'payment_gateway_global_methods',
    joinColumn: {
      name: 'paymentGatewayId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'globalPaymentMethodId',
      referencedColumnName: 'id',
    },
  })
  globalPaymentMethods: GlobalPaymentMethod[];

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  websiteUrl: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  notes: string;

  /**
   * Lowest denomination explanation - describes the smallest unit this payment gateway uses for payments
   * Examples:
   * - "Amounts are in cents (100 cents = 1 unit, e.g., $1.00 = 100 cents)"
   * - "Amounts are in base units (1000 base units = 1 unit, e.g., 1.00 = 1000 base units)"
   * - "Amounts are in minor units (100 minor units = 1 major unit)"
   * - "Amounts are sent as-is in the base currency unit"
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  lowestDenomination: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
