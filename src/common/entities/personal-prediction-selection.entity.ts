import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PersonalPrediction } from './personal-prediction.entity';
import { Match } from './match.entity';
import { PredictionType } from '../enums/prediction-type.enum';

@Entity('personal_prediction_selections')
@Index('idx_personal_prediction_selections_prediction_id', ['personalPrediction'])
@Index('idx_personal_prediction_selections_match_id', ['match'])
export class PersonalPredictionSelection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PersonalPrediction, { nullable: false })
  @JoinColumn({ name: 'personal_prediction_id', foreignKeyConstraintName: 'fk_personal_prediction_selections_prediction' })
  personalPrediction: PersonalPrediction;

  @ManyToOne(() => Match, { nullable: false })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'fk_personal_prediction_selections_match' })
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
