import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Unique,
  VersionColumn,
} from "typeorm";
import { User } from "./user.entity";
@Entity("user_wallets")
@Index("idx_user_wallets_user_id", ["user"])
@Unique("uk_user_wallets_user", ["user"])
export class UserWallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "fk_user_wallets_user",
  })
  user: User;
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  balance: number;
  @Column({ type: "varchar", length: 3, nullable: false, default: "GHS" })
  currency: string;
  @VersionColumn({ name: "version", nullable: false })
  version: number;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
