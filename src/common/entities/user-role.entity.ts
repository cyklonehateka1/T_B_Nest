import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
  BeforeInsert,
} from "typeorm";
import { User } from "./user.entity";
import { UserRoleType } from "../enums/user-role-type.enum";
@Entity("user_roles")
@Index("idx_user_roles_user_id", ["user"])
@Index("idx_user_roles_role", ["role"])
@Unique("uk_user_roles_user_role", ["user", "role"])
export class UserRole {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "fk_user_roles_user",
  })
  user: User;
  @Column({
    type: "enum",
    enum: UserRoleType,
    enumName: "user_role_type",
    nullable: false,
  })
  role: UserRoleType;
  @Column({ name: "granted_at", type: "timestamptz", nullable: false })
  grantedAt: Date;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: "granted_by",
    foreignKeyConstraintName: "fk_user_roles_granted_by",
  })
  grantedBy?: User;
  @BeforeInsert()
  setGrantedAt() {
    if (!this.grantedAt) {
      this.grantedAt = new Date();
    }
  }
}
