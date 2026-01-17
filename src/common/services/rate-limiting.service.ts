import { Injectable } from "@nestjs/common";
import rateLimit from "express-rate-limit";
import { Request } from "express";
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}
@Injectable()
export class RateLimitingService {
  getAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Authentication rate limit exceeded",
        message:
          "Too many authentication attempts. Please try again in 15 minutes.",
        statusCode: 429,
      },
      skipSuccessfulRequests: false,
      keyGenerator: (req: AuthenticatedRequest) => {
        return `${req.ip}-${req.get("User-Agent")}`;
      },
    });
  }
  getPaymentRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Payment rate limit exceeded",
        message: "Too many payment requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }
  getOrderRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Order rate limit exceeded",
        message: "Too many order requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }
  getProductRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Product browsing rate limit exceeded",
        message: "Too many product requests. Please slow down.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }
  getResourceRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Resource rate limit exceeded",
        message: "Too many resource requests. Please try again later.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }
  getEmailRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Email rate limit exceeded",
        message: "Too many email requests. Please try again in an hour.",
        statusCode: 429,
      },
      skipSuccessfulRequests: false,
      keyGenerator: (req: AuthenticatedRequest) => {
        const email = req.body?.email || req.query?.email;
        return email ? `email:${email}` : `ip:${req.ip}`;
      },
    });
  }
  getCartRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Cart rate limit exceeded",
        message: "Too many cart operations. Please slow down.",
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }
}
