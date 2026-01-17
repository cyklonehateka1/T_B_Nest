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
export function CustomRateLimit(type: RateLimitType) {
  const rateLimitConfigs = {
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: {
        error: "Authentication rate limit exceeded",
        message:
          "Too many authentication attempts. Please try again in 15 minutes.",
        statusCode: 429,
      },
      skipSuccessfulRequests: false,
    },
    payment: {
      windowMs: 15 * 60 * 1000,
      max: 50,
      message: {
        error: "Payment rate limit exceeded",
        message: "Too many payment requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    order: {
      windowMs: 15 * 60 * 1000,
      max: 30,
      message: {
        error: "Order rate limit exceeded",
        message: "Too many order requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    product: {
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: {
        error: "Product browsing rate limit exceeded",
        message: "Too many product requests. Please slow down.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    resource: {
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: {
        error: "Resource rate limit exceeded",
        message: "Too many resource requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
    email: {
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: {
        error: "Email rate limit exceeded",
        message: "Too many email requests. Please try again in an hour.",
        statusCode: 429,
      },
      skipSuccessfulRequests: false,
    },
    cart: {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: {
        error: "Cart rate limit exceeded",
        message: "Too many cart operations. Please slow down.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
    },
  };
  const config = rateLimitConfigs[type];
  const middleware = rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: AuthenticatedRequest) => {
      const userId = req.user?.id;
      const email = req.body?.email || req.query?.email;
      if (type === "email" && email) {
        return `email:${email}`;
      }
      return userId ? `user:${userId}` : `ip:${req.ip}`;
    },
  });
  return applyDecorators();
}
