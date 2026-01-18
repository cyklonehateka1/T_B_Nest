import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { User } from "../../common/entities/user.entity";
import { UserRole } from "../../common/entities/user-role.entity";
import { UserStatus } from "../../common/enums/user-status.enum";
import { UserRoleType } from "../../common/enums/user-role-type.enum";
import {
  DeletedUser,
  DeletionReason,
} from "../../common/entities/deleted-user.entity";
import { InvalidatedToken } from "../../common/entities/invalidated-token.entity";
import { SigninDto } from "./dto/signin.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ConfigService } from "@nestjs/config";
import { ApiResponse } from "../../common/dto/api-response.dto";
import { EmailService } from "../email/email.service";
import { Tipster } from "../../common/entities/tipster.entity";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import {
  SigninResponse,
  UserSessionResponse,
  GeolocationData,
} from "../../common/types/api-response.types";
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(DeletedUser)
    private readonly deletedUserRepository: Repository<DeletedUser>,
    @InjectRepository(InvalidatedToken)
    private readonly invalidatedTokenRepository: Repository<InvalidatedToken>,
    @InjectRepository(Tipster)
    private readonly tipsterRepository: Repository<Tipster>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}
  async login(signinDto: SigninDto): Promise<ApiResponse<any>> {
    const { email, password } = signinDto;
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email })
      .getOne();
    if (!user) {
      const deletedUser = await this.deletedUserRepository.findOne({
        where: { email: email },
      });
      if (deletedUser) {
        throw new UnauthorizedException("Account has been deleted");
      }
      throw new UnauthorizedException("Invalid credentials");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("Account is not active");
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not active");
    }
    if (!user.isVerified) {
      throw new UnauthorizedException(
        "Please verify your email before signing in",
      );
    }
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
      relations: ["user"],
    });
    const primaryRole =
      userRoles.length > 0 ? userRoles[0].role : UserRoleType.USER;
    const tokens = await this.generateTokens(user, userRoles);
    const displayName =
      user.displayName ||
      (user.firstName || user.lastName
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : undefined);
    const response = {
      token: tokens.accessToken,
      tokenType: "Bearer",
      id: user.id,
      email: user.email,
      displayName: displayName,
      role: primaryRole,
    };
    return ApiResponse.success(response, "Login successful");
  }
  async signin(signinDto: SigninDto): Promise<ApiResponse<SigninResponse>> {
    return this.login(signinDto);
  }
  async register(
    registerDto: RegisterDto,
  ): Promise<ApiResponse<{ message: string; email: string }>> {
    const { email, firstName, lastName, password, phoneNumber, country } =
      registerDto;
    const existingUser = await this.userRepository.findOne({
      where: { email: email },
    });
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }
    const deletedUser = await this.deletedUserRepository.findOne({
      where: { email: email },
    });
    if (deletedUser) {
      throw new ConflictException(
        "This email was previously associated with a deleted account",
      );
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const user = this.userRepository.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      passwordHash: password,
      phoneNumber: phoneNumber,
      status: UserStatus.ACTIVE,
      isVerified: false,
      otp: otp,
      otpExpiry: otpExpiry,
      isActive: true,
    });
    await this.userRepository.save(user);
    const userRole = this.userRoleRepository.create({
      user: user,
      role: UserRoleType.USER,
      grantedAt: new Date(),
    });
    await this.userRoleRepository.save(userRole);
    await this.emailService.sendOtpEmail(email, otp, firstName);
    return ApiResponse.success(
      { message: "OTP sent to your email", email: email },
      "Registration initiated. Please check your email for OTP verification.",
    );
  }
  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<ApiResponse<SigninResponse>> {
    const { email, otp } = verifyOtpDto;
    const user = await this.userRepository.findOne({
      where: { email: email },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.isVerified) {
      throw new BadRequestException("User is already verified");
    }
    if (user.otp !== otp) {
      throw new BadRequestException("Invalid OTP");
    }
    if (user.otpExpiry && user.otpExpiry < new Date()) {
      throw new BadRequestException("OTP has expired");
    }
    await this.userRepository.update(user.id, {
      isVerified: true,
      otp: undefined,
      otpExpiry: undefined,
    });
    const verifiedUser = await this.userRepository.findOne({
      where: { id: user.id },
    });
    if (!verifiedUser) {
      throw new NotFoundException("User not found after verification");
    }
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: verifiedUser.id } },
      relations: ["user"],
    });
    const tokens = await this.generateTokens(verifiedUser, userRoles);
    const response: SigninResponse = {
      ...tokens,
    };
    return ApiResponse.success(response, "Email verified successfully");
  }
  async resendOtp(email: string): Promise<ApiResponse<{ message: string }>> {
    const user = await this.userRepository.findOne({
      where: { email: email },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.isVerified) {
      throw new BadRequestException("User is already verified");
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.userRepository.update(user.id, {
      otp: otp,
      otpExpiry: otpExpiry,
    });
    await this.emailService.sendOtpEmail(email, otp, user.firstName || "");
    return ApiResponse.success(
      { message: "New OTP sent to your email" },
      "OTP resent successfully",
    );
  }
  async changePassword(
    changePasswordDto: ChangePasswordDto,
    currentUser: User,
  ): Promise<ApiResponse<null>> {
    const { oldPassword, newPassword } = changePasswordDto;
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: currentUser.id })
      .getOne();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const isOldPasswordValid = await user.validatePassword(oldPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException("Invalid old password");
    }
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        "New password must be different from current password",
      );
    }
    const emailParts = user.email.split("@")[0].toLowerCase();
    if (newPassword.toLowerCase().includes(emailParts)) {
      throw new BadRequestException(
        "Password cannot contain your email address",
      );
    }
    user.passwordHash = newPassword;
    await this.userRepository.save(user);
    try {
      await this.emailService.sendPasswordChangeNotification(user.email);
    } catch (error) {}
    return ApiResponse.success(null, "Password changed successfully");
  }
  async deleteAccount(
    deleteAccountDto: DeleteAccountDto,
    currentUser: User,
  ): Promise<ApiResponse<null>> {
    const { password, confirmation } = deleteAccountDto;
    const expectedConfirmation = "DELETE MY ACCOUNT";
    if (confirmation !== expectedConfirmation) {
      throw new BadRequestException(
        "Invalid confirmation message. Please type the exact confirmation text.",
      );
    }
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: currentUser.id })
      .getOne();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new BadRequestException("Invalid password");
    }
    if (!user.isActive) {
      throw new BadRequestException("Account is not active");
    }
    const userToDelete = await this.userRepository.findOne({
      where: { id: user.id },
    });
    if (!userToDelete) {
      throw new NotFoundException("User not found for deletion");
    }
    const deletedUser = this.deletedUserRepository.create({
      id: userToDelete.id,
      email: userToDelete.email,
      firstName: userToDelete.firstName,
      lastName: userToDelete.lastName,
      password: userToDelete.passwordHash,
      phoneNumber: userToDelete.phoneNumber,
      isVerified: userToDelete.isVerified,
      notificationPreferences: userToDelete.notificationPreferences,
      lastLoginAt: userToDelete.lastLoginAt,
      originalCreatedAt: userToDelete.createdAt,
      originalUpdatedAt: userToDelete.updatedAt,
      deletionReason: DeletionReason.USER_REQUESTED,
    });
    await this.deletedUserRepository.save(deletedUser);
    await this.userRepository.remove(userToDelete);
    try {
      await this.emailService.sendAccountDeletionNotification(user.email);
    } catch (error) {
      console.error("Failed to send account deletion notification:", error);
    }
    return ApiResponse.success(null, "Account deleted successfully");
  }
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ApiResponse<null>> {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOne({
      where: { email: email },
    });
    if (!user) {
      return ApiResponse.success(
        null,
        "Password reset email sent successfully",
      );
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    return ApiResponse.success(null, "Password reset email sent successfully");
  }
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ApiResponse<null>> {
    const { email, password, token } = resetPasswordDto;
    const user = await this.userRepository.findOne({
      where: { email: email },
    });
    if (!user) {
      throw new BadRequestException("Invalid reset token");
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await this.userRepository.update(user.id, {
      passwordHash: hashedPassword,
    });
    return ApiResponse.success(null, "Password reset successful");
  }
  async refreshToken(
    refreshToken: string,
  ): Promise<ApiResponse<SigninResponse>> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
      const invalidatedToken = await this.invalidatedTokenRepository.findOne({
        where: { tokenHash: refreshTokenHash },
      });
      if (invalidatedToken && !invalidatedToken.isExpired()) {
        throw new UnauthorizedException("Refresh token has been invalidated");
      }
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException("Invalid refresh token");
      }
      const userRoles = await this.userRoleRepository.find({
        where: { user: { id: user.id } },
        relations: ["user"],
      });
      const tokens = await this.generateTokens(user, userRoles);
      const response: SigninResponse = {
        ...tokens,
      };
      return ApiResponse.success(response, "Token refreshed successfully");
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
  async logout(
    userId: string,
    token?: string,
    refreshToken?: string,
  ): Promise<ApiResponse<null>> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (token) {
        try {
          const decoded = this.jwtService.decode(token) as any;
          const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + 60 * 60 * 1000);
          const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
          const existing = await this.invalidatedTokenRepository.findOne({
            where: { tokenHash },
          });
          if (!existing) {
            const invalidatedToken = this.invalidatedTokenRepository.create({
              tokenHash,
              expiresAt,
            });
            await this.invalidatedTokenRepository.save(invalidatedToken);
          }
        } catch (tokenError) {
          console.error("Error invalidating access token:", tokenError);
        }
      }
      if (refreshToken) {
        try {
          const decoded = this.jwtService.decode(refreshToken) as any;
          const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");
          const existingRefresh = await this.invalidatedTokenRepository.findOne(
            {
              where: { tokenHash: refreshTokenHash },
            },
          );
          if (!existingRefresh) {
            const invalidatedRefreshToken =
              this.invalidatedTokenRepository.create({
                tokenHash: refreshTokenHash,
                expiresAt,
              });
            await this.invalidatedTokenRepository.save(invalidatedRefreshToken);
          }
        } catch (refreshTokenError) {
          console.error("Error invalidating refresh token:", refreshTokenError);
        }
      }
      return ApiResponse.success(null, "Logout successful");
    } catch (error) {
      return ApiResponse.success(null, "Logout successful");
    }
  }
  async getUserSession(
    userId: string,
    userIP?: string,
  ): Promise<ApiResponse<UserSessionResponse>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
      relations: ["user"],
    });
    const roles = userRoles.map((ur) => ur.role);
    const geolocationData: GeolocationData | undefined = undefined;
    const response: UserSessionResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: roles[0] || UserRoleType.USER,
      roles: roles,
      phoneNumber: user.phoneNumber || undefined,
      isVerified: user.isVerified,
      geolocation: geolocationData,
    };
    return ApiResponse.success(response, "User session retrieved successfully");
  }
  async getSession(userId: string): Promise<ApiResponse<any>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
    });
    const primaryRole =
      userRoles.length > 0 ? userRoles[0].role : UserRoleType.USER;
    const displayName =
      user.displayName ||
      (user.firstName || user.lastName
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : undefined);
    const response = {
      id: user.id,
      email: user.email,
      displayName: displayName,
      role: primaryRole,
    };
    return ApiResponse.success(response, "Session retrieved successfully");
  }
  private getCountryName(countryCode: string): string {
    const countries: Record<string, string> = {
      US: "United States",
      GB: "United Kingdom",
      DE: "Germany",
      FR: "France",
      IT: "Italy",
      ES: "Spain",
      GH: "Ghana",
      NG: "Nigeria",
      KE: "Kenya",
      ZA: "South Africa",
      CA: "Canada",
      AU: "Australia",
      JP: "Japan",
      NL: "Netherlands",
      BE: "Belgium",
      AT: "Austria",
      CH: "Switzerland",
      SE: "Sweden",
      NO: "Norway",
      DK: "Denmark",
      FI: "Finland",
      IE: "Ireland",
      PT: "Portugal",
      GR: "Greece",
      PL: "Poland",
      CZ: "Czech Republic",
      HU: "Hungary",
      RO: "Romania",
      BG: "Bulgaria",
      HR: "Croatia",
      SI: "Slovenia",
      SK: "Slovakia",
      LT: "Lithuania",
      LV: "Latvia",
      EE: "Estonia",
      MT: "Malta",
      CY: "Cyprus",
      LU: "Luxembourg",
    };
    return countries[countryCode] || countryCode;
  }
  private async generateTokens(user: User, userRoles?: UserRole[]) {
    if (!userRoles) {
      userRoles = await this.userRoleRepository.find({
        where: { user: { id: user.id } },
      });
    }
    const roles = userRoles.map((ur) => ur.role);
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roles,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: "1h",
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: "7d",
      }),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: string): Promise<ApiResponse<ProfileResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Get user roles
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: userId } },
    });
    const roles = userRoles.map((ur) => ur.role);

    // Get tipster stats if user is a tipster
    let tipsterStats: {
      rating?: number;
      successRate?: number;
      totalTips?: number;
      successfulTips?: number;
    } = {};

    const hasTipsterRole = roles.includes(UserRoleType.TIPSTER);
    if (hasTipsterRole) {
      const tipster = await this.tipsterRepository.findOne({
        where: { user: { id: userId } },
      });

      if (tipster) {
        tipsterStats = {
          rating: parseFloat(tipster.rating.toString()),
          successRate: parseFloat(tipster.successRate.toString()),
          totalTips: tipster.totalTips,
          successfulTips: tipster.successfulTips,
        };
      }
    }

    const profile: ProfileResponseDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      aboutMe: user.aboutMe,
      isVerified: user.isVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accountNumber: user.accountNumber,
      accountName: user.accountName,
      bankCode: user.bankCode,
      bankName: user.bankName,
      ...tipsterStats,
      roles: roles,
    };

    return ApiResponse.success(profile, "Profile retrieved successfully");
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ApiResponse<ProfileResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if account number is being changed and validate uniqueness
    if (
      updateProfileDto.accountNumber &&
      updateProfileDto.accountNumber !== user.accountNumber
    ) {
      const existingUser = await this.userRepository.findOne({
        where: { accountNumber: updateProfileDto.accountNumber },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(
          "Account number is already in use by another user",
        );
      }
    }

    // Update user fields
    if (updateProfileDto.firstName !== undefined) {
      user.firstName = updateProfileDto.firstName;
    }
    if (updateProfileDto.lastName !== undefined) {
      user.lastName = updateProfileDto.lastName;
    }
    if (updateProfileDto.displayName !== undefined) {
      user.displayName = updateProfileDto.displayName;
    }
    if (updateProfileDto.phoneNumber !== undefined) {
      user.phoneNumber = updateProfileDto.phoneNumber;
    }
    if (updateProfileDto.avatarUrl !== undefined) {
      user.avatarUrl = updateProfileDto.avatarUrl;
    }
    if (updateProfileDto.aboutMe !== undefined) {
      user.aboutMe = updateProfileDto.aboutMe;
    }
    if (updateProfileDto.accountNumber !== undefined) {
      user.accountNumber = updateProfileDto.accountNumber;
    }
    if (updateProfileDto.accountName !== undefined) {
      user.accountName = updateProfileDto.accountName;
    }
    if (updateProfileDto.bankCode !== undefined) {
      user.bankCode = updateProfileDto.bankCode;
    }
    if (updateProfileDto.bankName !== undefined) {
      user.bankName = updateProfileDto.bankName;
    }

    await this.userRepository.save(user);

    // Return updated profile
    return await this.getProfile(userId);
  }
}
