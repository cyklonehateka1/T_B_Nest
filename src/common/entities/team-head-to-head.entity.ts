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

@Entity("team_head_to_head")
@Index("idx_h2h_team_a", ["teamA"])
@Index("idx_h2h_team_b", ["teamB"])
@Index("idx_h2h_league", ["league"])
@Unique("uk_h2h_teams_league", [
  "teamA",
  "teamB",
  "league",
])
export class TeamHeadToHead {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "team_a_id",
    foreignKeyConstraintName: "fk_h2h_team_a",
  })
  teamA: Team;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "team_b_id",
    foreignKeyConstraintName: "fk_h2h_team_b",
  })
  teamB: Team;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({
    name: "league_id",
    foreignKeyConstraintName: "fk_h2h_league",
  })
  league?: League;

  // Aggregated H2H stats
  @Column({
    name: "total_matches",
    type: "integer",
    nullable: false,
    default: 0,
  })
  totalMatches: number;

  @Column({
    name: "team_a_wins",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamAWins: number;

  @Column({
    name: "team_b_wins",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamBWins: number;

  @Column({ type: "integer", nullable: false, default: 0 })
  draws: number;

  // Recent H2H (last 5 matches)
  @Column({
    name: "recent_matches",
    type: "jsonb",
    nullable: true,
    comment: "Array of recent match results: [{date, homeTeam, awayTeam, homeScore, awayScore, result}]",
  })
  recentMatches?: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    result: "home" | "away" | "draw";
  }>;

  // When team A is home
  @Column({
    name: "team_a_home_wins",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamAHomeWins: number;

  @Column({
    name: "team_a_home_draws",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamAHomeDraws: number;

  @Column({
    name: "team_a_home_losses",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamAHomeLosses: number;

  // When team B is home
  @Column({
    name: "team_b_home_wins",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamBHomeWins: number;

  @Column({
    name: "team_b_home_draws",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamBHomeDraws: number;

  @Column({
    name: "team_b_home_losses",
    type: "integer",
    nullable: false,
    default: 0,
  })
  teamBHomeLosses: number;

  @Column({
    name: "last_match_date",
    type: "timestamptz",
    nullable: true,
  })
  lastMatchDate?: Date;

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
