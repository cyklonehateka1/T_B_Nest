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
import { MatchData } from "./match-data.entity";
import { CompetitionType } from "../enums/competition-type.enum";

@Entity("match_predictability_scores")
@Index("idx_match_predictability_match_id", ["match"])
@Index("idx_match_predictability_score", ["predictabilityScore"])
@Index("idx_match_predictability_competition", ["competitionType"])
@Index("idx_match_predictability_combined_importance", ["combinedImportanceScore"])
@Unique("uk_match_predictability_match", ["match"])
export class MatchPredictabilityScore {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MatchData, { nullable: false })
  @JoinColumn({
    name: "match_id",
    foreignKeyConstraintName: "fk_match_predictability_match",
  })
  match: MatchData;

  @Column({
    name: "competition_type",
    type: "enum",
    enum: CompetitionType,
    nullable: false,
  })
  competitionType: CompetitionType;

  @Column({
    name: "predictability_score",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    comment: "How predictable this match is (0-100)",
  })
  predictabilityScore: number;

  @Column({
    name: "combined_importance_score",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: false,
    comment: "Combined importance of both teams",
  })
  combinedImportanceScore: number;

  @Column({
    name: "predictability_factors",
    type: "jsonb",
    nullable: true,
    comment: "Factors affecting predictability",
  })
  predictabilityFactors?: {
    teamFormConsistency?: number;
    headToHeadPattern?: number;
    homeAdvantage?: number;
    injuryImpact?: number;
    motivationLevel?: number;
    oddsClarity?: number; // How clear the odds are
    historicalVariance?: number; // Lower variance = more predictable
  };

  @Column({
    name: "calculation_method",
    type: "varchar",
    length: 50,
    nullable: true,
    comment: "Method used to calculate (e.g., 'ml_model', 'rule_based')",
  })
  calculationMethod?: string;

  @Column({
    name: "calculated_at",
    type: "timestamptz",
    nullable: false,
  })
  calculatedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
