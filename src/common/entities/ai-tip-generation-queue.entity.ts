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
import { Tip } from "./tip.entity";

export enum GenerationQueueStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}

@Entity("ai_tip_generation_queue")
@Index("idx_generation_queue_match_id", ["match"])
@Index("idx_generation_queue_status", ["status"])
@Index("idx_generation_queue_tip_id", ["generatedTip"])
@Index("idx_generation_queue_created_at", ["createdAt"])
@Unique("uk_generation_queue_match", ["match"])
export class AiTipGenerationQueue {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MatchData, { nullable: false })
  @JoinColumn({
    name: "match_id",
    foreignKeyConstraintName: "fk_generation_queue_match",
  })
  match: MatchData;

  @Column({
    type: "enum",
    enum: GenerationQueueStatus,
    nullable: false,
    default: GenerationQueueStatus.PENDING,
  })
  status: GenerationQueueStatus;

  @Column({
    name: "generation_attempts",
    type: "integer",
    nullable: false,
    default: 0,
  })
  generationAttempts: number;

  @Column({
    name: "last_attempted_at",
    type: "timestamptz",
    nullable: true,
  })
  lastAttemptedAt?: Date;

  @Column({
    name: "completed_at",
    type: "timestamptz",
    nullable: true,
  })
  completedAt?: Date;

  @ManyToOne(() => Tip, { nullable: true })
  @JoinColumn({
    name: "generated_tip_id",
    foreignKeyConstraintName: "fk_generation_queue_tip",
  })
  generatedTip?: Tip;

  @Column({
    name: "skip_reason",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Reason why generation was skipped",
  })
  skipReason?: string;

  @Column({
    name: "error_message",
    type: "text",
    nullable: true,
    comment: "Error message if generation failed",
  })
  errorMessage?: string;

  @Column({
    name: "data_maturity_score",
    type: "integer",
    nullable: true,
    comment: "Data maturity score at time of generation",
  })
  dataMaturityScore?: number;

  @Column({
    name: "context_size",
    type: "integer",
    nullable: true,
    comment: "Estimated context size in tokens",
  })
  contextSize?: number;

  @Column({
    name: "generation_latency",
    type: "integer",
    nullable: true,
    comment: "Generation latency in milliseconds",
  })
  generationLatency?: number;

  @Column({
    name: "batch_id",
    type: "uuid",
    nullable: true,
    comment: "Batch ID for batch processing",
  })
  batchId?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
