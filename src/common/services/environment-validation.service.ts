import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EnvironmentValidationService {
  private readonly logger = new Logger(EnvironmentValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  validateProductionEnvironment(): void {
    const nodeEnv = this.configService.get<string>("NODE_ENV");

    if (nodeEnv === "production") {
      this.validateRequiredVariables();
      this.validateSecuritySettings();
      this.logger.log(
        "Production environment validation completed successfully",
      );
    } else {
      this.logger.log(
        "Development environment - skipping production validation",
      );
    }
  }

  private validateRequiredVariables(): void {
    const requiredVars = [
      "DATABASE_URL",
      "JWT_SECRET",
      "JWT_REFRESH_SECRET",
      "BREVO_SMTP_API_KEY",
      "EMAIL_FROM",
      "EMAIL_FROM_NAME",
      "FRONTEND_URL",
      "SUPPORT_EMAIL",
    ];

    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      const value = this.configService.get<string>(varName);
      if (!value || value.trim() === "") {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables for production: ${missingVars.join(", ")}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private validateSecuritySettings(): void {
    // Validate JWT secrets are strong enough
    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    const jwtRefreshSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET");

    if (jwtSecret && jwtSecret.length < 32) {
      this.logger.warn(
        "JWT_SECRET should be at least 32 characters long for production",
      );
    }

    if (jwtRefreshSecret && jwtRefreshSecret.length < 32) {
      this.logger.warn(
        "JWT_REFRESH_SECRET should be at least 32 characters long for production",
      );
    }

    // Validate that JWT secrets are not default values
    const defaultSecrets = [
      "your_super_secret_jwt_key_here_make_it_long_and_random",
      "your_super_secret_refresh_jwt_key_here_make_it_long_and_random",
    ];

    if (jwtSecret && defaultSecrets.includes(jwtSecret)) {
      throw new Error(
        "JWT_SECRET must be changed from default value in production",
      );
    }

    if (jwtRefreshSecret && defaultSecrets.includes(jwtRefreshSecret)) {
      throw new Error(
        "JWT_REFRESH_SECRET must be changed from default value in production",
      );
    }

    // Validate email configuration
    const emailFrom = this.configService.get<string>("EMAIL_FROM");
    const allowLocalhost =
      this.configService.get<string>("ALLOW_LOCALHOST_IN_PRODUCTION") ===
      "true";

    if (emailFrom && emailFrom.includes("localhost") && !allowLocalhost) {
      throw new Error("EMAIL_FROM must not contain localhost in production");
    }

    // FRONTEND_URL can be localhost - no restriction
  }

  validateDatabaseConfiguration(): void {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    const dbHost = this.configService.get<string>("DB_HOST");

    if (!databaseUrl && !dbHost) {
      throw new Error("Either DATABASE_URL or DB_HOST must be configured");
    }

    // Check for hardcoded credentials in DATABASE_URL
    if (databaseUrl) {
      const suspiciousPatterns = [
        "localhost",
        "127.0.0.1",
        "neondb_owner", // The hardcoded credential we saw
        "npg_m2lD3sHWLbkY", // The hardcoded credential we saw
      ];

      for (const pattern of suspiciousPatterns) {
        if (databaseUrl.includes(pattern)) {
          this.logger.warn(
            `DATABASE_URL contains suspicious pattern: ${pattern}`,
          );
        }
      }
    }
  }
}
