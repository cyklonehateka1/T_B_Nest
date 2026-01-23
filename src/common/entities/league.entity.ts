import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Provider } from "./provider.entity";
import { Sport } from "./sport.entity";
import { CompetitionType } from "../enums/competition-type.enum";
@Entity("leagues")
@Index("idx_leagues_name", ["name"])
@Index("idx_leagues_country", ["country"])
@Index("idx_leagues_is_active", ["isActive"])
@Index("idx_leagues_competition_type", ["competitionType"])
@Index("idx_leagues_top_5_european", ["isTop5European"])
@Unique("uk_leagues_provider_external_id", ["provider", "externalId"])
export class League {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ name: "external_id", type: "varchar", length: 100, nullable: true })
  externalId?: string;
  @ManyToOne(() => Provider, { nullable: true })
  @JoinColumn({
    name: "provider_id",
    foreignKeyConstraintName: "fk_leagues_provider",
  })
  provider?: Provider;
  @ManyToOne(() => Sport, { nullable: true })
  @JoinColumn({
    name: "sport_id",
    foreignKeyConstraintName: "fk_leagues_sport",
  })
  sport?: Sport;
  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;
  @Column({ type: "varchar", length: 100, nullable: true })
  country?: string;
  @Column({ name: "logo_url", type: "text", nullable: true })
  logoUrl?: string;
  @Column({
    name: "is_active",
    type: "boolean",
    nullable: false,
    default: true,
  })
  isActive: boolean;
  @Column({
    name: "competition_type",
    type: "enum",
    enum: CompetitionType,
    nullable: true,
    comment: "Type of competition this league represents",
  })
  competitionType?: CompetitionType;
  @Column({
    name: "is_top_5_european",
    type: "boolean",
    nullable: false,
    default: false,
    comment: "Is this one of the top 5 European leagues",
  })
  isTop5European: boolean;
  @Column({
    name: "league_tier",
    type: "integer",
    nullable: true,
    comment: "League tier/ranking (1 = top tier, higher = lower tier)",
  })
  leagueTier?: number;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
