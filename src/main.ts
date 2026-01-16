import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { RateLimitingService } from "./common/services/rate-limiting.service";
import { EnvironmentValidationService } from "./common/services/environment-validation.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [
          "https://admin.tipster.com",
          "https://tipster.com",
          "https://www.tipster.com",
          "https://app.tipster.com",
          "https://admin-api.tipster.com",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          process.env.FRONTEND_URL,
        ].filter(Boolean)
      : [
          "https://admin.tipster.com",
          "https://tipster.com",
          "https://www.tipster.com",
          "https://app.tipster.com",
          "https://admin-api.tipster.com",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          process.env.FRONTEND_URL,
        ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-API-Key",
      "Cache-Control",
      "Pragma",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.use(helmet());

  // Get services
  const rateLimitingService = app.get(RateLimitingService);
  const envValidationService = app.get(EnvironmentValidationService);

  // Validate production environment
  envValidationService.validateProductionEnvironment();
  envValidationService.validateDatabaseConfiguration();

  // Global burst protection - Short-term spike protection
  // Endpoint-specific limits (below) handle longer-term restrictions
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Too many requests",
        message: "Burst rate limit exceeded. Please slow down your requests.",
        statusCode: 429,
      },
      skip: (req) => {
        return req.url === "/health" || req.url === "/health/live";
      },
    })
  );

  // Endpoint-specific rate limiting
  app.use("/auth", rateLimitingService.getAuthRateLimit());
  app.use("/orders", rateLimitingService.getOrderRateLimit());
  app.use("/payments", rateLimitingService.getPaymentRateLimit());
  app.use("/products", rateLimitingService.getProductRateLimit());
  app.use("/resources", rateLimitingService.getResourceRateLimit());
  app.use("/email", rateLimitingService.getEmailRateLimit());
  app.use("/cart", rateLimitingService.getCartRateLimit());

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Set global prefix to match Java backend
  app.setGlobalPrefix("api");

  // Swagger documentation - only enable in development/localhost
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Tipster Betting API")
      .setDescription("Secure API for betting tips platform")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document);
  }

  await app.listen(process.env.PORT ?? 3002);
}

void bootstrap();
