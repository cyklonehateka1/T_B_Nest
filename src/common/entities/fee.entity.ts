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
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
} from "class-validator";
import { CountrySettings } from "./country-settings.entity";

export enum FeeType {
  TAX = "tax",
  FEE = "fee",
}

export enum TaxType {
  INCLUSIVE = "inclusive",
  EXCLUSIVE = "exclusive",
}

export enum FeeCalculationType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

@Entity("fees")
export class Fee {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column("text")
  @IsString()
  @IsNotEmpty()
  description: string;

  @Column({
    type: "enum",
    enum: FeeType,
    enumName: "fee_type",
  })
  @IsEnum(FeeType)
  type: FeeType;

  @Column({ default: true })
  @IsBoolean()
  enabled: boolean;

  // Tax Configuration (like VAT)
  @Column({
    type: "enum",
    enum: TaxType,
    enumName: "tax_type",
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  taxRate?: number;

  // Fee Configuration (like processing/service fees)
  @Column({
    type: "enum",
    enum: FeeCalculationType,
    enumName: "fee_calculation_type",
    nullable: true,
  })
  @IsOptional()
  @IsEnum(FeeCalculationType)
  feeCalculationType?: FeeCalculationType;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  feeValue?: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  feeCurrencyId?: string;

  // Country relationship
  @Column()
  @IsString()
  @IsNotEmpty()
  countrySettingsId: string;

  @ManyToOne(() => CountrySettings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "countrySettingsId" })
  countrySettings: CountrySettings;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
