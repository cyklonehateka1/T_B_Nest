import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Tipster } from "./tipster.entity";
import { TipSelection } from "./tip-selection.entity";
import { TipStatusType } from "../enums/tip-status-type.enum";
@Entity("tips")
@Index("idx_tips_tipster_id", ["tipster"])
@Index("idx_tips_is_ai", ["isAi"])
@Index("idx_tips_status", ["status"])
@Index("idx_tips_is_published", ["isPublished"])
@Index("idx_tips_published_at", ["publishedAt"])
@Index("idx_tips_earliest_match_date", ["earliestMatchDate"])
@Index("idx_tips_status_published", ["status", "isPublished"])
@Index("idx_tips_created_at", ["createdAt"])
export class Tip {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @ManyToOne(() => Tipster, { nullable: false })
  @JoinColumn({
    name: "tipster_id",
    foreignKeyConstraintName: "fk_tips_tipster",
  })
  tipster: Tipster;
  @OneToMany(() => TipSelection, (selection) => selection.tip)
  selections?: TipSelection[];
  @Column({ name: "is_ai", type: "boolean", nullable: false, default: false })
  isAi: boolean;
  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;
  @Column({ type: "text", nullable: true })
  description?: string;
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  price: number;
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
  @Column({
    name: "is_published",
    type: "boolean",
    nullable: false,
    default: false,
  })
  isPublished: boolean;
  @Column({
    name: "purchases_count",
    type: "integer",
    nullable: false,
    default: 0,
  })
  purchasesCount: number;
  @Column({
    name: "total_revenue",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalRevenue: number;
  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt?: Date;
  @Column({ name: "earliest_match_date", type: "timestamptz", nullable: true })
  earliestMatchDate?: Date;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
