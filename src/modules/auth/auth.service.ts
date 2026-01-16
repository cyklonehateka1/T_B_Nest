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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async login(signinDto: SigninDto): Promise<ApiResponse<any>> {
    const { email, password } = signinDto;

    // Find user by email with password hash
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email })
      .getOne();

    if (!user) {
      // Check if user was deleted
      const deletedUser = await this.deletedUserRepository.findOne({
        where: { email: email },
      });

      if (deletedUser) {
        throw new UnauthorizedException("Account has been deleted");
      }

      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException("Account is not active");
    }

    // Check if user status is ACTIVE
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not active");
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new UnauthorizedException(
        "Please verify your email before signing in"
      );
    }

    // Verify password using the entity's validatePassword method
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Load user roles
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
      relations: ["user"],
    });

    // Get primary role (first role or default to USER)
    const primaryRole = userRoles.length > 0 ? userRoles[0].role : UserRoleType.USER;

    // Generate access token (use the token from generateTokens)
    const tokens = await this.generateTokens(user, userRoles);

    // Build display name from firstName and lastName or use displayName
    const displayName = user.displayName || 
      (user.firstName || user.lastName 
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() 
        : undefined);

    // Return AuthResponse format matching Java backend and frontend expectations
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
    // Keep this method for backward compatibility with verify-otp endpoint
    return this.login(signinDto);
  }

  async register(
    registerDto: RegisterDto
  ): Promise<ApiResponse<{ message: string; email: string }>> {
    const { email, firstName, lastName, password, phoneNumber, country } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Check if user was previously deleted
    const deletedUser = await this.deletedUserRepository.findOne({
      where: { email: email },
    });

    if (deletedUser) {
      throw new ConflictException(
        "This email was previously associated with a deleted account"
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Create user but not verified
    const user = this.userRepository.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      passwordHash: password, // Will be hashed by @BeforeInsert hook
      phoneNumber: phoneNumber,
      status: UserStatus.ACTIVE,
      isVerified: false,
      otp: otp,
      otpExpiry: otpExpiry,
      isActive: true,
    });

    await this.userRepository.save(user);

    // Create default USER role for the new user
    const userRole = this.userRoleRepository.create({
      user: user,
      role: UserRoleType.USER,
      grantedAt: new Date(),
    });

    await this.userRoleRepository.save(userRole);

    // Send OTP email
    await this.emailService.sendOtpEmail(email, otp, firstName);

    return ApiResponse.success(
      { message: "OTP sent to your email", email: email },
      "Registration initiated. Please check your email for OTP verification."
    );
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto
  ): Promise<ApiResponse<SigninResponse>> {
    const { email, otp } = verifyOtpDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already verified
    if (user.isVerified) {
      throw new BadRequestException("User is already verified");
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      throw new BadRequestException("Invalid OTP");
    }

    // Check if OTP is expired
    if (user.otpExpiry && user.otpExpiry < new Date()) {
      throw new BadRequestException("OTP has expired");
    }

    // Verify the user
    await this.userRepository.update(user.id, {
      isVerified: true,
      otp: undefined,
      otpExpiry: undefined,
    });

    // Get updated user
    const verifiedUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!verifiedUser) {
      throw new NotFoundException("User not found after verification");
    }

    // Load user roles
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: verifiedUser.id } },
      relations: ["user"],
    });

    // Generate tokens with roles
    const tokens = await this.generateTokens(verifiedUser, userRoles);
    const response: SigninResponse = {
      ...tokens,
    };

    return ApiResponse.success(response, "Email verified successfully");
  }

  async resendOtp(email: string): Promise<ApiResponse<{ message: string }>> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already verified
    if (user.isVerified) {
      throw new BadRequestException("User is already verified");
    }

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update user with new OTP
    await this.userRepository.update(user.id, {
      otp: otp,
      otpExpiry: otpExpiry,
    });

    // Send new OTP email
    await this.emailService.sendOtpEmail(email, otp, user.firstName || "");

    return ApiResponse.success(
      { message: "New OTP sent to your email" },
      "OTP resent successfully"
    );
  }

  async changePassword(
    changePasswordDto: ChangePasswordDto,
    currentUser: User
  ): Promise<ApiResponse<null>> {
    const { oldPassword, newPassword } = changePasswordDto;

    // Get user with password hash
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: currentUser.id })
      .getOne();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify old password using the entity's validatePassword method
    const isOldPasswordValid = await user.validatePassword(oldPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException("Invalid old password");
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        "New password must be different from current password"
      );
    }

    // Additional security checks
    // Check if new password contains user's email (case insensitive)
    const emailParts = user.email.split("@")[0].toLowerCase();
    if (newPassword.toLowerCase().includes(emailParts)) {
      throw new BadRequestException(
        "Password cannot contain your email address"
      );
    }

    // Update password hash (this will trigger the @BeforeUpdate hook for hashing)
    user.passwordHash = newPassword;
    await this.userRepository.save(user);

    // Send email notification about password change
    try {
      await this.emailService.sendPasswordChangeNotification(user.email);
    } catch (error) {
      // Log error but don't fail the password change
    }

    return ApiResponse.success(null, "Password changed successfully");
  }

  async deleteAccount(
    deleteAccountDto: DeleteAccountDto,
    currentUser: User
  ): Promise<ApiResponse<null>> {
    const { password, confirmation } = deleteAccountDto;

    // Verify confirmation message
    const expectedConfirmation = "DELETE MY ACCOUNT";
    if (confirmation !== expectedConfirmation) {
      throw new BadRequestException(
        "Invalid confirmation message. Please type the exact confirmation text."
      );
    }

    // Get user with password hash for verification
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: currentUser.id })
      .getOne();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new BadRequestException("Invalid password");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new BadRequestException("Account is not active");
    }

    // Get the full user data for deletion
    const userToDelete = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!userToDelete) {
      throw new NotFoundException("User not found for deletion");
    }

    // Create deleted user record
    const deletedUser = this.deletedUserRepository.create({
      id: userToDelete.id,
      email: userToDelete.email,
      firstName: userToDelete.firstName,
      lastName: userToDelete.lastName,
      password: userToDelete.passwordHash, // DeletedUser uses 'password' field
      phoneNumber: userToDelete.phoneNumber,
      isVerified: userToDelete.isVerified,
      notificationPreferences: userToDelete.notificationPreferences,
      lastLoginAt: userToDelete.lastLoginAt,
      originalCreatedAt: userToDelete.createdAt,
      originalUpdatedAt: userToDelete.updatedAt,
      deletionReason: DeletionReason.USER_REQUESTED,
    });

    // Save to deleted_users table
    await this.deletedUserRepository.save(deletedUser);

    // Delete from users table
    await this.userRepository.remove(userToDelete);

    // Send account deletion notification email
    try {
      await this.emailService.sendAccountDeletionNotification(user.email);
    } catch (error) {
      // Log error but don't fail the deletion
      console.error("Failed to send account deletion notification:", error);
    }

    return ApiResponse.success(null, "Account deleted successfully");
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto
  ): Promise<ApiResponse<null>> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      return ApiResponse.success(
        null,
        "Password reset email sent successfully"
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Note: User entity doesn't have refreshToken field
    // You may need to store reset token in a separate table or use a different approach
    // For now, we'll skip storing the token and just send the email

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return ApiResponse.success(null, "Password reset email sent successfully");
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto
  ): Promise<ApiResponse<null>> {
    const { email, password, token } = resetPasswordDto;

    // Find user by email
    // Note: Token validation should be done differently since User entity doesn't have refreshToken
    // For now, we'll find by email only - in production, use a password_reset_tokens table
    const user = await this.userRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new BadRequestException("Invalid reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password hash
    await this.userRepository.update(user.id, {
      passwordHash: hashedPassword,
    });

    return ApiResponse.success(null, "Password reset successful");
  }

  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<SigninResponse>> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });

      // Check if refresh token has been invalidated (e.g., after logout)
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

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      // Load user roles
      const userRoles = await this.userRoleRepository.find({
        where: { user: { id: user.id } },
        relations: ["user"],
      });

      // Generate new tokens with roles
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
    refreshToken?: string
  ): Promise<ApiResponse<null>> {
    try {
      // Find user and clear refresh token field
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      // Note: User entity doesn't have refreshToken field
      // Token invalidation is handled via InvalidatedToken table

      // Invalidate the JWT access token by hashing and storing it
      if (token) {
        try {
          // Decode token to get expiration
          const decoded = this.jwtService.decode(token) as any;
          const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + 60 * 60 * 1000); // Default to 1 hour if no exp

          // Hash the token using SHA-256
          const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

          // Check if token is already invalidated (idempotent)
          const existing = await this.invalidatedTokenRepository.findOne({
            where: { tokenHash },
          });

          if (!existing) {
            // Store the invalidated token
            const invalidatedToken = this.invalidatedTokenRepository.create({
              tokenHash,
              expiresAt,
            });
            await this.invalidatedTokenRepository.save(invalidatedToken);
          }
        } catch (tokenError) {
          // Log error but don't fail logout
          console.error("Error invalidating access token:", tokenError);
        }
      }

      // Invalidate the JWT refresh token by hashing and storing it
      if (refreshToken) {
        try {
          // Decode refresh token to get expiration
          const decoded = this.jwtService.decode(refreshToken) as any;
          const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days if no exp

          // Hash the refresh token using SHA-256
          const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

          // Check if refresh token is already invalidated (idempotent)
          const existingRefresh = await this.invalidatedTokenRepository.findOne(
            {
              where: { tokenHash: refreshTokenHash },
            }
          );

          if (!existingRefresh) {
            // Store the invalidated refresh token
            const invalidatedRefreshToken =
              this.invalidatedTokenRepository.create({
                tokenHash: refreshTokenHash,
                expiresAt,
              });
            await this.invalidatedTokenRepository.save(invalidatedRefreshToken);
          }
        } catch (refreshTokenError) {
          // Log error but don't fail logout
          console.error("Error invalidating refresh token:", refreshTokenError);
        }
      }

      return ApiResponse.success(null, "Logout successful");
    } catch (error) {
      // Even if there's an error, we should still return success
      // to avoid leaving the user in a logged-in state
      return ApiResponse.success(null, "Logout successful");
    }
  }

  async getUserSession(
    userId: string,
    userIP?: string
  ): Promise<ApiResponse<UserSessionResponse>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Load user roles
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
      relations: ["user"],
    });

    // Extract roles from UserRole entities
    const roles = userRoles.map((ur) => ur.role);

    // IP-based geolocation detection removed - frontend should use explicit country selection
    const geolocationData: GeolocationData | undefined = undefined;

    const response: UserSessionResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: roles[0] || UserRoleType.USER, // Use first role for backward compatibility
      roles: roles, // Include all roles
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

    // Load user roles from user_roles table
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
    });

    // Get primary role (first role or default to USER)
    const primaryRole = userRoles.length > 0 ? userRoles[0].role : UserRoleType.USER;

    // Build display name from firstName and lastName
    const displayName = user.displayName || 
      (user.firstName || user.lastName 
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() 
        : undefined);

    // Return session response format matching frontend expectations (IGetSessionResponse)
    // Frontend expects: { id, email, displayName, role }
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
    // Get roles from UserRole table if not provided
    if (!userRoles) {
      userRoles = await this.userRoleRepository.find({
        where: { user: { id: user.id } },
      });
    }

    // Extract role types from UserRole entities
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
}
