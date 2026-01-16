import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { User } from "./user.entity";
import { UserRoleType } from "../enums/user-role-type.enum";

export enum InviteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

@Entity("user_invites")
export class UserInvite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @IsEmail()
  email: string;

  @Column({
    type: "enum",
    enum: UserRoleType,
    enumName: "user_role_type",
  })
  @IsEnum(UserRoleType)
  role: UserRoleType;

  @Column({
    type: "enum",
    enum: InviteStatus,
    enumName: "invite_status",
    default: InviteStatus.PENDING,
  })
  @IsEnum(InviteStatus)
  status: InviteStatus;

  @Column({ unique: true })
  @IsString()
  token: string;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "invitedById" })
  invitedBy: User;

  @Column({ nullable: true })
  acceptedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  canBeAccepted(): boolean {
    return this.status === InviteStatus.PENDING && !this.isExpired();
  }
}
