import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('providers')
@Index('idx_providers_name', ['name'])
@Index('idx_providers_code', ['code'])
@Index('idx_providers_is_active', ['isActive'])
@Unique('uk_providers_code', ['code'])
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'base_url', type: 'text', nullable: false })
  baseUrl: string;

  @Column({ name: 'api_key', type: 'text', nullable: true })
  apiKey?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'rate_limit_per_minute', type: 'integer', nullable: true })
  rateLimitPerMinute?: number;

  @Column({ name: 'rate_limit_per_day', type: 'integer', nullable: true })
  rateLimitPerDay?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
