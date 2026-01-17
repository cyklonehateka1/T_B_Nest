import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { IsString, IsEnum, IsOptional, IsObject } from "class-validator";
import { GlobalPaymentMethod } from "./global-payment-method.entity";
export enum PaymentGatewayStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
}
export enum PaymentMethodHandlingMode {
  CHECKOUT_URL = "checkout_url",
  DIRECT = "direct",
}
export type PaymentMethodHandling = Record<string, PaymentMethodHandlingMode>;
@Entity("payment_gateways")
export class PaymentGateway {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ unique: true })
  @IsString()
  name: string;
  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  description: string;
  @Column({
    type: "enum",
    enum: PaymentGatewayStatus,
    enumName: "payment_gateway_status",
    default: PaymentGatewayStatus.INACTIVE,
  })
  @IsEnum(PaymentGatewayStatus)
  status: PaymentGatewayStatus;
  @Column({ type: "jsonb", nullable: true })
  @IsOptional()
  @IsObject()
  configuration: any;
  @Column({ type: "jsonb", nullable: true })
  @IsOptional()
  @IsObject()
  paymentMethodHandling?: PaymentMethodHandling;
  @ManyToMany(() => GlobalPaymentMethod)
  @JoinTable({
    name: "payment_gateway_global_methods",
    joinColumn: {
      name: "paymentGatewayId",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "globalPaymentMethodId",
      referencedColumnName: "id",
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
  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  notes: string;
  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  lowestDenomination: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
