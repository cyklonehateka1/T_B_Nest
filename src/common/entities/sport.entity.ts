import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

@Entity("sports")
@Index("idx_sports_group", ["sportGroup"])
@Index("idx_sports_key", ["sportKey"])
@Index("idx_sports_is_active", ["isActive"])
@Unique("uk_sports_key", ["sportKey"])
export class Sport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "sport_key",
    type: "varchar",
    length: 100,
    unique: true,
    nullable: false,
  })
  sportKey: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    name: "sport_group",
    type: "varchar",
    length: 100,
    nullable: false,
  })
  sportGroup: string;

  @Column({
    name: "is_active",
    type: "boolean",
    nullable: false,
    default: true,
  })
  isActive: boolean;

  @Column({
    name: "has_outrights",
    type: "boolean",
    nullable: false,
    default: false,
  })
  hasOutrights: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
