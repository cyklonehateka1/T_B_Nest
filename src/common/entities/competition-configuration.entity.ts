import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";
import { CompetitionType } from "../enums/competition-type.enum";

@Entity("competition_configurations")
@Index("idx_competition_config_type", ["competitionType"])
@Unique("uk_competition_config_type", ["competitionType"])
export class CompetitionConfiguration {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "competition_type",
    type: "enum",
    enum: CompetitionType,
    unique: true,
    nullable: false,
  })
  competitionType: CompetitionType;

  @Column({
    name: "is_enabled",
    type: "boolean",
    nullable: false,
    default: true,
  })
  isEnabled: boolean;

  @Column({
    name: "generation_schedule",
    type: "varchar",
    length: 100,
    nullable: false,
    comment: "Cron expression for generation (e.g., '0 18 * * 4' for Thursday 6 PM)",
  })
  generationSchedule: string;

  @Column({
    name: "time_window_hours",
    type: "integer",
    nullable: false,
    default: 72,
    comment: "Hours before match to generate tip",
  })
  timeWindowHours: number;

  @Column({
    name: "max_matches_per_tip",
    type: "integer",
    nullable: true,
    comment: "Max matches to include in one tip",
  })
  maxMatchesPerTip?: number;

  @Column({
    name: "selection_criteria",
    type: "jsonb",
    nullable: true,
    comment: "Competition-specific selection criteria",
  })
  selectionCriteria?: {
    minImportanceScore?: number;
    minPredictabilityScore?: number;
    maxPredictabilityScore?: number; // Some competitions want unpredictable matches
    targetLeagues?: string[]; // League external IDs
    excludeLeagues?: string[];
    minOdds?: number;
    maxOdds?: number;
  };

  @Column({
    name: "tip_title_template",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Template for tip title (e.g., 'Weekend Acca', 'Champions League Picks')",
  })
  tipTitleTemplate?: string;

  @Column({
    name: "auto_publish",
    type: "boolean",
    nullable: false,
    default: true,
  })
  autoPublish: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
