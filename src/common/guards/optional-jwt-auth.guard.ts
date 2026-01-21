import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { from, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

/**
 * Optional JWT Authentication Guard
 * Allows requests with or without authentication.
 * If a valid JWT token is present, it populates req.user.
 * If no token is present, the request continues without req.user.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Try to activate authentication, but catch errors to make it optional
    const result = super.canActivate(context);

    // Handle different return types
    if (result instanceof Promise) {
      return result.catch(() => {
        // If authentication fails (no token or invalid token), allow request to continue
        return true;
      });
    }

    if (result instanceof Observable) {
      return result.pipe(
        catchError(() => {
          // If authentication fails, allow request to continue
          return of(true);
        }),
      );
    }

    // If it's a boolean, return as is
    return result;
  }

  handleRequest(err: any, user: any, info: any) {
    // If there's no token or token is invalid, return undefined instead of throwing
    // This allows the route to work with or without authentication
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}
