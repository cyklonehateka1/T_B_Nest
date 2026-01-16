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
import { User } from './user.entity';

@Entity('platform_settings')
@Index('idx_platform_settings_key', ['key'])
@Index('idx_platform_settings_category', ['category'])
@Index('idx_platform_settings_is_public', ['isPublic'])
@Unique('uk_platform_settings_key', ['key'])
export class PlatformSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  key: string;

  @Column({ type: 'text', nullable: true })
  value?: string;

  @Column({ name: 'value_type', type: 'varchar', length: 20, nullable: false, default: 'string' })
  valueType: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string;

  @Column({ name: 'is_public', type: 'boolean', nullable: false, default: false })
  isPublic: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by', foreignKeyConstraintName: 'fk_platform_settings_updated_by' })
  updatedBy?: User;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
