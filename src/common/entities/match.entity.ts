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
import { League } from "./league.entity";
import { Team } from "./team.entity";
import { MatchStatusType } from "../enums/match-status-type.enum";

@Entity("matches")
@Index("idx_matches_league_id", ["league"])
@Index("idx_matches_home_team_id", ["homeTeam"])
@Index("idx_matches_away_team_id", ["awayTeam"])
@Index("idx_matches_match_date", ["matchDate"])
@Index("idx_matches_status", ["status"])
@Index("idx_matches_external_id", ["externalId"])
@Index("idx_matches_date_status", ["matchDate", "status"])
@Unique("uk_matches_external_id", ["externalId"])
export class Match {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "external_id",
    type: "varchar",
    length: 100,
    unique: true,
    nullable: true,
  })
  externalId?: string;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({
    name: "league_id",
    foreignKeyConstraintName: "fk_matches_league",
  })
  league?: League;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "home_team_id",
    foreignKeyConstraintName: "fk_matches_home_team",
  })
  homeTeam: Team;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({
    name: "away_team_id",
    foreignKeyConstraintName: "fk_matches_away_team",
  })
  awayTeam: Team;

  @Column({ name: "match_date", type: "timestamptz", nullable: false })
  matchDate: Date;

  @Column({
    type: "enum",
    enum: MatchStatusType,
    enumName: "match_status_type",
    nullable: false,
    default: MatchStatusType.scheduled,
  })
  status: MatchStatusType;

  @Column({ name: "home_score", type: "integer", nullable: true })
  homeScore?: number;

  @Column({ name: "away_score", type: "integer", nullable: true })
  awayScore?: number;

  @Column({ name: "home_score_penalty", type: "integer", nullable: true })
  homeScorePenalty?: number;

  @Column({ name: "away_score_penalty", type: "integer", nullable: true })
  awayScorePenalty?: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  venue?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  referee?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  round?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  season?: string;

  @Column({ name: "last_synced_at", type: "timestamptz", nullable: true })
  lastSyncedAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
