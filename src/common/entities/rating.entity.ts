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
import { Tipster } from './tipster.entity';
import { User } from './user.entity';
import { Purchase } from './purchase.entity';

@Entity('ratings')
@Index('idx_ratings_tipster_id', ['tipster'])
@Index('idx_ratings_user_id', ['user'])
@Index('idx_ratings_purchase_id', ['purchase'])
@Index('idx_ratings_rating', ['rating'])
@Index('idx_ratings_created_at', ['createdAt'])
@Unique('uk_ratings_user_tipster_purchase', ['user', 'tipster', 'purchase'])
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tipster, { nullable: false })
  @JoinColumn({ name: 'tipster_id', foreignKeyConstraintName: 'fk_ratings_tipster' })
  tipster: Tipster;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_ratings_user' })
  user: User;

  @ManyToOne(() => Purchase, { nullable: true })
  @JoinColumn({ name: 'purchase_id', foreignKeyConstraintName: 'fk_ratings_purchase' })
  purchase?: Purchase;

  @Column({ type: 'integer', nullable: false })
  rating: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  reviewText?: string;

  @Column({ name: 'is_verified', type: 'boolean', nullable: false, default: false })
  isVerified: boolean;

  @Column({ name: 'is_visible', type: 'boolean', nullable: false, default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
