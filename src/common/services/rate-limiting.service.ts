import { Injectable } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

@Injectable()
export class RateLimitingService {
  /**
   * Get rate limiting configuration for authentication endpoints
   * More restrictive due to security concerns
   */
  getAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per 15 minutes (1.3 req/min)
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Authentication rate limit exceeded',
        message:
          'Too many authentication attempts. Please try again in 15 minutes.',
        statusCode: 429,
      },
      skipSuccessfulRequests: false, // Count all requests, including successful ones
      keyGenerator: (req: AuthenticatedRequest) => {
        // Use IP + user agent for more specific limiting
        return `${req.ip}-${req.get('User-Agent')}`;
      },
    });
  }

  /**
   * Get rate limiting configuration for payment endpoints
   * Moderate restrictions for financial operations
   */
  getPaymentRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // 50 requests per 15 minutes (3.3 req/min)
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Payment rate limit exceeded',
        message: 'Too many payment requests. Please try again later.',
        statusCode: 429,
      },
      skipSuccessfulRequests: true, // Don't count successful payments
      keyGenerator: (req: AuthenticatedRequest) => {
        // Use user ID if authenticated, otherwise IP
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }

  /**
   * Get rate limiting configuration for order endpoints
   * Moderate restrictions for order operations
   */
  getOrderRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30, // 30 requests per 15 minutes (2 req/min)
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Order rate limit exceeded',
        message: 'Too many order requests. Please try again later.',
        statusCode: 429,
      },
      skipSuccessfulRequests: true, // Don't count successful orders
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }

  /**
   * Get rate limiting configuration for product browsing
   * More lenient for browsing operations
   */
  getProductRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 requests per 15 minutes (33 req/min)
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Product browsing rate limit exceeded',
        message: 'Too many product requests. Please slow down.',
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }

  /**
   * Get rate limiting configuration for resource endpoints
   * Moderate restrictions for API resources
   */
  getResourceRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per 15 minutes (13 req/min)
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Resource rate limit exceeded',
        message: 'Too many resource requests. Please try again later.',
        statusCode: 429,
      },
      skipSuccessfulRequests: true,
      keyGenerator: (req: AuthenticatedRequest) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
    });
  }

  /**
   * Get rate limiting configuration for email operations
   * Very restrictive to prevent email spam
   */
  getEmailRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 email requests per hour
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Email rate limit exceeded',
        message: 'Too many email requests. Please try again in an hour.',
        statusCode: 429,
      },
      skipSuccessfulRequests: false, // Count all email attempts
      keyGenerator: (req: AuthenticatedRequest) => {
        // Use email address if available, otherwise IP
        const email = req.body?.email || req.query?.email;
        return email ? `email:${email}` : `ip:${req.ip}`;
      },
    });
  }

  /**
   * Get rate limiting configuration for cart operations
   * Moderate restrictions for cart management
   */
  getCartRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes (6.7 req/min)
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Cart rate limit exceeded',
        message: 'Too many cart operations. Please slow down.',
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
