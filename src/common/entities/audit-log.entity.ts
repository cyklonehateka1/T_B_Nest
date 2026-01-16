import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { User } from './user.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  VIEW = 'view',
  EXPORT = 'export',
  IMPORT = 'import',
}

export enum AuditResource {
  USER = 'user',
  PRODUCT = 'product',
  TRANSACTION = 'transaction',
  SETTING = 'setting',
  NOTIFICATION = 'notification',
  SYSTEM = 'system',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
    enumName: 'audit_action',
  })
  @IsEnum(AuditAction)
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
    enumName: 'audit_resource',
  })
  @IsEnum(AuditResource)
  resource: AuditResource;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  resourceId: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  newValues: Record<string, any>;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  ipAddress: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
