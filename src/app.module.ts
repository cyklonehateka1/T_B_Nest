import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { EmailModule } from "./modules/email/email.module";
import { LeaguesModule } from "./modules/leagues/leagues.module";
import { MatchesModule } from "./modules/matches/matches.module";
import { MatchSyncModule } from "./modules/match-sync/match-sync.module";
import { TipsModule } from "./modules/tips/tips.module";
import { AppSettingsModule } from "./modules/app-settings/app-settings.module";
import { CountrySettingsModule } from "./modules/country-settings/country-settings.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { TipEvaluationModule } from "./modules/tip-evaluation/tip-evaluation.module";
import { AuditLog } from "./common/entities/audit-log.entity";
import { UserInvite } from "./common/entities/user-invite.entity";
import { TemporarySession } from "./common/entities/temporary-session.entity";
import { GlobalPaymentMethod } from "./common/entities/global-payment-method.entity";
import { PaymentGateway } from "./common/entities/payment-gateway.entity";
import { Fee } from "./common/entities/fee.entity";
import { PaymentMethod } from "./common/entities/payment-method.entity";
import { AdminNotificationPreferences } from "./common/entities/admin-notification-preferences.entity";
import { Notification } from "./common/entities/notification.entity";
import { CountrySettings } from "./common/entities/country-settings.entity";
import { User } from "./common/entities/user.entity";
import { DeletedUser } from "./common/entities/deleted-user.entity";
import { InvalidatedToken } from "./common/entities/invalidated-token.entity";
import { Sport } from "./common/entities/sport.entity";
import { Provider } from "./common/entities/provider.entity";
import { Team } from "./common/entities/team.entity";
import { League } from "./common/entities/league.entity";
import { Match } from "./common/entities/match.entity";
import { MatchData } from "./common/entities/match-data.entity";
import { Tipster } from "./common/entities/tipster.entity";
import { Tip } from "./common/entities/tip.entity";
import { TipSelection } from "./common/entities/tip-selection.entity";
import { Purchase } from "./common/entities/purchase.entity";
import { Escrow } from "./common/entities/escrow.entity";
import { Transaction } from "./common/entities/transaction.entity";
import { UserWallet } from "./common/entities/user-wallet.entity";
import { Rating } from "./common/entities/rating.entity";
import { Report } from "./common/entities/report.entity";
import { PersonalPrediction } from "./common/entities/personal-prediction.entity";
import { PersonalPredictionSelection } from "./common/entities/personal-prediction-selection.entity";
import { TipsterApplication } from "./common/entities/tipster-application.entity";
import { UserRole } from "./common/entities/user-role.entity";
import { PlatformSetting } from "./common/entities/platform-setting.entity";
import { AppSettings } from "./common/entities/app-settings.entity";
import { RateLimitingService } from "./common/services/rate-limiting.service";
import { EnvironmentValidationService } from "./common/services/environment-validation.service";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error("DATABASE_URL environment variable is required");
        }
        return {
          type: "postgres",
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          extra: {
            charset: "utf8",
          },
          ssl:
            process.env.NODE_ENV === "production" ||
            databaseUrl.includes("sslmode=require")
              ? { rejectUnauthorized: false }
              : false,
          entities: [
            CountrySettings,
            User,
            AuditLog,
            UserInvite,
            TemporarySession,
            GlobalPaymentMethod,
            PaymentGateway,
            Fee,
            PaymentMethod,
            AdminNotificationPreferences,
            Notification,
            DeletedUser,
            InvalidatedToken,
            Sport,
            Provider,
            Team,
            League,
            Match,
            MatchData,
            Tipster,
            Tip,
            TipSelection,
            Purchase,
            Escrow,
            Transaction,
            UserWallet,
            Rating,
            Report,
            PersonalPrediction,
            PersonalPredictionSelection,
            TipsterApplication,
            UserRole,
            PlatformSetting,
            AppSettings,
          ],
        };
      },
    }),
    AuthModule,
    HealthModule,
    EmailModule,
    LeaguesModule,
    MatchesModule,
    MatchSyncModule,
    TipsModule,
    AppSettingsModule,
    CountrySettingsModule,
    PaymentsModule,
    TipEvaluationModule,
  ],
  controllers: [AppController],
  providers: [AppService, RateLimitingService, EnvironmentValidationService],
})
export class AppModule {}
