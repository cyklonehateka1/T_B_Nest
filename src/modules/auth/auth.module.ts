import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { User } from "../../common/entities/user.entity";
import { UserRole } from "../../common/entities/user-role.entity";
import { DeletedUser } from "../../common/entities/deleted-user.entity";
import { InvalidatedToken } from "../../common/entities/invalidated-token.entity";
import { EmailModule } from "../email/email.module";
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, UserRole, DeletedUser, InvalidatedToken]),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "1h",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
