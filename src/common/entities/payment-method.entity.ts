import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { CountrySettings } from './country-settings.entity';
import { GlobalPaymentMethod } from './global-payment-method.entity';

export enum PaymentMethodType {
  MOBILE_MONEY = 'mobile_money',
  BANK_CARD = 'bank_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CRYPTO = 'crypto',
  OTHER = 'other',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column('text')
  @IsString()
  @IsNotEmpty()
  description: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    enumName: 'payment_method_type',
  })
  @IsString()
  type: PaymentMethodType;

  @Column({ default: true })
  @IsBoolean()
  enabled: boolean;

  // Additional configuration fields
  @Column('json', { nullable: true })
  @IsOptional()
  configuration?: Record<string, any>;

  // Country relationship
  @Column()
  @IsString()
  @IsNotEmpty()
  countrySettingsId: string;

  @ManyToOne(() => CountrySettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'countrySettingsId' })
  countrySettings: CountrySettings;

  // Global payment method relationship (optional for backward compatibility)
  @Column({ nullable: true })
  @IsOptional()
  globalPaymentMethodId?: string;

  @ManyToOne(() => GlobalPaymentMethod, { nullable: true })
  @JoinColumn({ name: 'globalPaymentMethodId' })
  globalPaymentMethod?: GlobalPaymentMethod;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
