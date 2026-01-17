import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { TipStatusType } from "../enums/tip-status-type.enum";
@Entity("personal_predictions")
@Index("idx_personal_predictions_user_id", ["user"])
@Index("idx_personal_predictions_status", ["status"])
@Index("idx_personal_predictions_earliest_match_date", ["earliestMatchDate"])
@Index("idx_personal_predictions_user_status", ["user", "status"])
export class PersonalPrediction {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "fk_personal_predictions_user",
  })
  user: User;
  @Column({ type: "varchar", length: 255, nullable: true })
  title?: string;
  @Column({
    name: "total_stake",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
  })
  totalStake: number;
  @Column({
    name: "total_odds",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  totalOdds?: number;
  @Column({
    type: "enum",
    enum: TipStatusType,
    enumName: "tip_status_type",
    nullable: false,
    default: TipStatusType.PENDING,
  })
  status: TipStatusType;
  @Column({ name: "earliest_match_date", type: "timestamptz", nullable: false })
  earliestMatchDate: Date;
  @Column({
    name: "created_at_12hr_before_match",
    type: "boolean",
    nullable: false,
    default: false,
  })
  createdAt12hrBeforeMatch: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
