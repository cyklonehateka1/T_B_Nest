import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsPositive,
} from "class-validator";
import { Fee } from "./fee.entity";
import { PaymentMethod } from "./payment-method.entity";
@Entity("country_settings")
export class CountrySettings {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  flag: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  localCurrencyCode?: string;

  @Column("decimal", {
    precision: 18,
    scale: 8,
    nullable: true,
    comment:
      "Exchange rate from local currency to USD. Multiply local currency amount by this rate to get USD equivalent.",
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  localCurrencyToUsdRate?: number;

  @OneToMany(() => Fee, (fee) => fee.countrySettings, { cascade: true })
  fees: Fee[];

  @OneToMany(
    () => PaymentMethod,
    (paymentMethod) => paymentMethod.countrySettings,
    { cascade: true },
  )
  paymentMethods: PaymentMethod[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
