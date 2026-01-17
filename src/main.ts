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
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [
          "https:
          "https:
          "https:
          "https:
          "https:
          "http:
          "http:
          "http:
          process.env.FRONTEND_URL,
        ].filter(Boolean)
      : [
          "https:
          "https:
          "https:
          "https:
          "https:
          "http:
          "http:
          "http:
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
  const rateLimitingService = app.get(RateLimitingService);
  const envValidationService = app.get(EnvironmentValidationService);
  envValidationService.validateProductionEnvironment();
  envValidationService.validateDatabaseConfiguration();
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 100,
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
    }),
  );
  app.use("/auth", rateLimitingService.getAuthRateLimit());
  app.use("/orders", rateLimitingService.getOrderRateLimit());
  app.use("/payments", rateLimitingService.getPaymentRateLimit());
  app.use("/products", rateLimitingService.getProductRateLimit());
  app.use("/resources", rateLimitingService.getResourceRateLimit());
  app.use("/email", rateLimitingService.getEmailRateLimit());
  app.use("/cart", rateLimitingService.getCartRateLimit());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api");
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
