import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorStatus,
} from "@nestjs/terminus";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ApiResponse as ApiResponseDto } from "../../common/dto/api-response.dto";
import { HealthCheckResponse } from "../../common/types/api-response.types";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "Check application health" })
  @ApiResponse({
    status: 200,
    description: "Application is healthy",
    schema: {
      example: {
        success: true,
        data: {
          status: "ok",
          info: {
            database: { status: "up" },
            memory_heap: { status: "up" },
            memory_rss: { status: "up" },
          },
          error: {},
          details: {
            database: { status: "up" },
            memory_heap: { status: "up" },
            memory_rss: { status: "up" },
          },
        },
        message: "Health check completed successfully",
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: "Application is unhealthy",
    schema: {
      example: {
        success: false,
        data: {
          status: "error",
          info: {},
          error: {
            database: { status: "down", message: "Database connection failed" },
          },
          details: {
            database: { status: "down", message: "Database connection failed" },
          },
        },
        message: "Health check failed",
      },
    },
  })
  async check(): Promise<ApiResponseDto<HealthCheckResponse>> {
    const healthResult = await this.health.check([
      // Database health check with longer timeout
      () => this.db.pingCheck("database", { timeout: 5000 }),

      // Memory health check (warn if heap usage > 500MB for development)
      () => this.memory.checkHeap("memory_heap", 500 * 1024 * 1024),

      // RSS memory check (warn if RSS > 200MB for development)
      () => this.memory.checkRSS("memory_rss", 200 * 1024 * 1024),
    ]);

    const isHealthy = healthResult.status === "ok";
    const message = isHealthy
      ? "Health check completed successfully"
      : "Health check failed";

    // Transform to our expected format
    const healthResponse: HealthCheckResponse = {
      status: healthResult.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      database: {
        status: healthResult.details?.database?.status || "unknown",
        responseTime: 0, // Could be calculated from actual DB ping
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage:
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
          100,
      },
    };

    return ApiResponseDto.success(healthResponse, message);
  }

  @Get("ping")
  @ApiOperation({ summary: "Simple ping endpoint" })
  @ApiResponse({
    status: 200,
    description: "Pong response",
    schema: {
      example: {
        success: true,
        data: {
          status: "ok",
          timestamp: "2025-07-05T08:15:21.953Z",
          uptime: 10.905088916,
          environment: "development",
          version: "0.0.1",
        },
        message: "Ping successful",
      },
    },
  })
  ping(): ApiResponseDto<any> {
    const pingData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };

    return ApiResponseDto.success(pingData, "Ping successful");
  }
}
