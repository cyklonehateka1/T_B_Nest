import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "express";
import * as crypto from "crypto";
import { User } from "../../common/entities/user.entity";
import { UserRole } from "../../common/entities/user-role.entity";
import { InvalidatedToken } from "../../common/entities/invalidated-token.entity";
import { UserStatus } from "../../common/enums/user-status.enum";
import { UserRoleType } from "../../common/enums/user-role-type.enum";
export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRoleType[];
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(InvalidatedToken)
    private readonly invalidatedTokenRepository: Repository<InvalidatedToken>,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: JwtPayload) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invalidatedToken = await this.invalidatedTokenRepository.findOne({
        where: { tokenHash },
      });
      if (invalidatedToken && !invalidatedToken.isExpired()) {
        throw new UnauthorizedException("Token has been invalidated");
      }
      if (invalidatedToken && invalidatedToken.isExpired()) {
        await this.invalidatedTokenRepository.remove(invalidatedToken);
      }
    }
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || user.status !== UserStatus.ACTIVE || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
    });
    const roles = userRoles.map((ur) => ur.role);
    return {
      id: user.id,
      email: user.email,
      roles: roles,
      role: roles[0] || UserRoleType.USER,
    };
  }
}
