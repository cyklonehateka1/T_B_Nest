import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRoleType } from "../../../common/enums/user-role-type.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleType[]>(
      "roles",
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false; // No user in request
    }

    // Check if user has any of the required roles
    // Support both user.roles (array) and user.role (single) for backward compatibility
    const userRoles: UserRoleType[] = user.roles || (user.role ? [user.role] : []);
    
    return requiredRoles.some((requiredRole) => userRoles.includes(requiredRole));
  }
}
