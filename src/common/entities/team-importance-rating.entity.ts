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

@Entity("team_importance_ratings")
@Index("idx_team_importance_team_id", ["team"])
@Index("idx_team_importance_league_id", ["league"])
@Index("idx_team_importance_score", ["importanceScore"])
@Index("idx_team_importance_global_score", ["globalImportanceScore"])
@Unique("uk_team_importance_team_league", ["team", "league"])
export class TeamImportanceRating {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "team_id",
    foreignKeyConstraintName: "fk_team_importance_team",
  })
  team: Team;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({
    name: "league_id",
    foreignKeyConstraintName: "fk_team_importance_league",
  })
  league?: League; // null for international teams

  @Column({
    name: "importance_score",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    comment: "Team importance score (0-100)",
  })
  importanceScore: number;

  @Column({
    name: "global_importance_score",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
    comment: "Global importance (for cross-league comparison)",
  })
  globalImportanceScore?: number;

  @Column({
    name: "rating_factors",
    type: "jsonb",
    nullable: true,
    comment: "Breakdown of rating factors",
  })
  ratingFactors?: {
    leaguePosition?: number;
    recentForm?: number;
    historicalSuccess?: number;
    fanBase?: number;
    marketValue?: number;
    starPlayers?: number;
    mediaCoverage?: number;
  };

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
