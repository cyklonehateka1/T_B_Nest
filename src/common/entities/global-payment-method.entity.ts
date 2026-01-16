import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export enum GlobalPaymentMethodType {
  MOBILE_MONEY = 'mobile_money',
  BANK_CARD = 'bank_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CRYPTO = 'crypto',
  OTHER = 'other',
}

@Entity('global_payment_methods')
export class GlobalPaymentMethod {
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
    enum: GlobalPaymentMethodType,
    enumName: 'global_payment_method_type',
  })
  @IsString()
  type: GlobalPaymentMethodType;

  @Column({ default: true })
  @IsBoolean()
  enabled: boolean;

  // Additional configuration fields
  @Column('json', { nullable: true })
  @IsOptional()
  configuration?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
