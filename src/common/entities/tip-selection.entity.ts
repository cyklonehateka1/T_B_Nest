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
} from 'typeorm';
import { Tip } from './tip.entity';
import { Match } from './match.entity';
import { PredictionType } from '../enums/prediction-type.enum';

@Entity('tip_selections')
@Index('idx_tip_selections_tip_id', ['tip'])
@Index('idx_tip_selections_match_id', ['match'])
@Index('idx_tip_selections_prediction_type', ['predictionType'])
@Unique('uk_tip_selections', ['tip', 'match', 'predictionType', 'predictionValue'])
export class TipSelection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tip, { nullable: false })
  @JoinColumn({ name: 'tip_id', foreignKeyConstraintName: 'fk_tip_selections_tip' })
  tip: Tip;

  @ManyToOne(() => Match, { nullable: false })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'fk_tip_selections_match' })
  match: Match;

  @Column({
    name: 'prediction_type',
    type: 'enum',
    enum: PredictionType,
    enumName: 'prediction_type',
    nullable: false,
  })
  predictionType: PredictionType;

  @Column({ name: 'prediction_value', type: 'varchar', length: 100, nullable: false })
  predictionValue: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  odds?: number;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect?: boolean;

  @Column({ name: 'is_void', type: 'boolean', nullable: false, default: false })
  isVoid: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
