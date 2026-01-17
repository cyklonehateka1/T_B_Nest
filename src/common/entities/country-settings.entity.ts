import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from "class-validator";
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
  @Column()
  @IsString()
  @IsNotEmpty()
  localCurrency?: string;
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
