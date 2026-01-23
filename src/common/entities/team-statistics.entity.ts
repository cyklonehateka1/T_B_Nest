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

@Entity("team_statistics")
@Index("idx_team_stats_team_id", ["team"])
@Index("idx_team_stats_league_id", ["league"])
@Index("idx_team_stats_season", ["season"])
@Index("idx_team_stats_team_league_season", ["team", "league", "season"])
@Unique("uk_team_stats_team_league_season", ["team", "league", "season"])
export class TeamStatistics {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "team_id",
    foreignKeyConstraintName: "fk_team_stats_team",
  })
  team: Team;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({
    name: "league_id",
    foreignKeyConstraintName: "fk_team_stats_league",
  })
  league?: League;

  @Column({ type: "varchar", length: 50, nullable: true })
  season?: string;

  // Aggregated stats
  @Column({
    name: "matches_played",
    type: "integer",
    nullable: false,
    default: 0,
  })
  matchesPlayed: number;

  @Column({ type: "integer", nullable: false, default: 0 })
  wins: number;

  @Column({ type: "integer", nullable: false, default: 0 })
  draws: number;

  @Column({ type: "integer", nullable: false, default: 0 })
  losses: number;

  @Column({
    name: "goals_scored",
    type: "integer",
    nullable: false,
    default: 0,
  })
  goalsScored: number;

  @Column({
    name: "goals_conceded",
    type: "integer",
    nullable: false,
    default: 0,
  })
  goalsConceded: number;

  @Column({
    name: "clean_sheets",
    type: "integer",
    nullable: false,
    default: 0,
  })
  cleanSheets: number;

  // Recent form (last 5 matches)
  @Column({
    name: "recent_form",
    type: "varchar",
    length: 5,
    nullable: true,
    comment: "Last 5 matches: W=Win, D=Draw, L=Loss (e.g., 'WWDLW')",
  })
  recentForm?: string;

  @Column({
    name: "recent_goals_scored",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Goals scored in last 5 matches",
  })
  recentGoalsScored: number;

  @Column({
    name: "recent_goals_conceded",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Goals conceded in last 5 matches",
  })
  recentGoalsConceded: number;

  // Home/Away specific
  @Column({
    name: "home_matches",
    type: "integer",
    nullable: false,
    default: 0,
  })
  homeMatches: number;

  @Column({
    name: "home_wins",
    type: "integer",
    nullable: false,
    default: 0,
  })
  homeWins: number;

  @Column({
    name: "home_draws",
    type: "integer",
    nullable: false,
    default: 0,
  })
  homeDraws: number;

  @Column({
    name: "home_losses",
    type: "integer",
    nullable: false,
    default: 0,
  })
  homeLosses: number;

  @Column({
    name: "away_matches",
    type: "integer",
    nullable: false,
    default: 0,
  })
  awayMatches: number;

  @Column({
    name: "away_wins",
    type: "integer",
    nullable: false,
    default: 0,
  })
  awayWins: number;

  @Column({
    name: "away_draws",
    type: "integer",
    nullable: false,
    default: 0,
  })
  awayDraws: number;

  @Column({
    name: "away_losses",
    type: "integer",
    nullable: false,
    default: 0,
  })
  awayLosses: number;

  // Calculated fields
  @Column({
    name: "win_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
    comment: "Win rate percentage",
  })
  winRate?: number;

  @Column({
    name: "avg_goals_scored",
    type: "decimal",
    precision: 4,
    scale: 2,
    nullable: true,
    comment: "Average goals scored per match",
  })
  avgGoalsScored?: number;

  @Column({
    name: "avg_goals_conceded",
    type: "decimal",
    precision: 4,
    scale: 2,
    nullable: true,
    comment: "Average goals conceded per match",
  })
  avgGoalsConceded?: number;

  @Column({
    name: "league_position",
    type: "integer",
    nullable: true,
    comment: "Current position in league table",
  })
  leaguePosition?: number;

  @Column({
    name: "points",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Total points (3 for win, 1 for draw)",
  })
  points: number;

  @Column({
    name: "goal_difference",
    type: "integer",
    nullable: false,
    default: 0,
    comment: "Goals scored - Goals conceded",
  })
  goalDifference: number;

  @Column({
    name: "last_updated_at",
    type: "timestamptz",
    nullable: false,
  })
  lastUpdatedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
