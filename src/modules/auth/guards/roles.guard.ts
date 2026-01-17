import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRoleType } from "../../../common/enums/user-role-type.enum";
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleType[]>(
      "roles",
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      this.logger.warn(`Access denied: No user in request`);
      throw new ForbiddenException("Authentication required. Please log in.");
    }
    const userRoles: UserRoleType[] =
      user.roles || (user.role ? [user.role] : []);
    this.logger.debug(
      `Checking roles for user ${user.id}: userRoles=${JSON.stringify(userRoles)}, requiredRoles=${JSON.stringify(requiredRoles)}`,
    );
    const hasRequiredRole = requiredRoles.some((requiredRole) =>
      userRoles.includes(requiredRole),
    );
    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied for user ${user.id}: User has roles [${userRoles.join(", ")}] but required roles are [${requiredRoles.join(", ")}]`,
      );
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(" or ")}. Your current roles: ${userRoles.length > 0 ? userRoles.join(", ") : "none"}`,
      );
    }
    return true;
  }
}
