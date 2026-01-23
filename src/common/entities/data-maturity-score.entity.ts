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
import { Team } from "./team.entity";
import { League } from "./league.entity";

export enum DataMaturityConfidence {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

@Entity("data_maturity_scores")
@Index("idx_maturity_team_id", ["team"])
@Index("idx_maturity_league_id", ["league"])
@Index("idx_maturity_score", ["score"])
@Index("idx_maturity_confidence", ["confidence"])
@Unique("uk_maturity_team_league", ["team", "league"])
export class DataMaturityScore {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "team_id",
    foreignKeyConstraintName: "fk_maturity_team",
  })
  team: Team;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({
    name: "league_id",
    foreignKeyConstraintName: "fk_maturity_league",
  })
  league?: League;

  @Column({
    type: "integer",
    nullable: false,
    comment: "Maturity score (0-100)",
  })
  score: number;

  // Metrics used for calculation
  @Column({
    name: "total_matches",
    type: "integer",
    nullable: false,
    default: 0,
  })
  totalMatches: number;

  @Column({
    name: "recent_matches",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Matches in last 30 days",
  })
  recentMatches: number;

  @Column({
    name: "head_to_head_matches",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Number of H2H matches available",
  })
  headToHeadMatches: number;

  @Column({
    name: "data_age_days",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Days since first match data",
  })
  dataAgeDays: number;

  @Column({
    name: "completeness_percentage",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
    comment: "Percentage of fields populated (0-100)",
  })
  completenessPercentage: number;

  @Column({
    type: "enum",
    enum: DataMaturityConfidence,
    nullable: false,
    default: DataMaturityConfidence.LOW,
  })
  confidence: DataMaturityConfidence;

  @Column({
    name: "last_calculated_at",
    type: "timestamptz",
    nullable: false,
  })
  lastCalculatedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
