import { applyDecorators, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import rateLimit from "express-rate-limit";
import { Request } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export type RateLimitType = "auth" | "product" | "resource" | "email";

/**
 * Custom rate limiting decorator for different endpoint types
 */
export function CustomRateLimit(type: RateLimitType) {
  const rateLimitConfigs = {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per 15 minutes
      message: {
        error: "Authentication rate limit exceeded",
        message:
          "Too many authentication attempts. Please try again in 15 minutes.",
        statusCode: 429,
      },
      skipSuccessfulRequests: false,
    },
    payment: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // 50 requests per 15 minutes
      message: {
        error: "Payment rate limit exceeded",
        message: "Too many payment requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    order: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30, // 30 requests per 15 minutes
      message: {
        error: "Order rate limit exceeded",
        message: "Too many order requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    product: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 requests per 15 minutes
      message: {
        error: "Product browsing rate limit exceeded",
        message: "Too many product requests. Please slow down.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    resource: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per 15 minutes
      message: {
        error: "Resource rate limit exceeded",
        message: "Too many resource requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    email: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 requests per hour
      message: {
        error: "Email rate limit exceeded",
        message: "Too many email requests. Please try again in an hour.",
        statusCode: 429,
      },
      skipSuccessfulRequests: false,
    },
    cart: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: {
        error: "Cart rate limit exceeded",
        message: "Too many cart operations. Please slow down.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
  };

  const config = rateLimitConfigs[type];

  // Create a middleware function that can be applied to routes
  const middleware = rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: AuthenticatedRequest) => {
      // Use user ID if authenticated, otherwise IP
      const userId = req.user?.id;
      const email = req.body?.email || req.query?.email;

      if (type === "email" && email) {
        return `email:${email}`;
      }

      return userId ? `user:${userId}` : `ip:${req.ip}`;
    },
  });

  // For now, return an empty decorator since we can't directly apply express middleware in NestJS decorators
  // The middleware should be applied in the main.ts or controller level
  return applyDecorators();
}
