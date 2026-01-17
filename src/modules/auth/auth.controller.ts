import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { SigninDto } from "./dto/signin.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../common/entities/user.entity";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";
import {
  SigninResponse,
  UserSessionResponse,
} from "../../common/types/api-response.types";
class SigninResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken: string;
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken: string;
}
class RegisterResponseDto {
  @ApiProperty({ example: "OTP sent to your email" })
  message: string;
  @ApiProperty({ example: "customer@example.com" })
  email: string;
}
class UserSessionResponseDto {
  @ApiProperty({ example: "user-uuid-here" })
  id: string;
  @ApiProperty({ example: "customer@example.com" })
  email: string;
  @ApiProperty({ example: "John" })
  firstName: string;
  @ApiProperty({ example: "Doe" })
  lastName: string;
  @ApiProperty({ example: "customer" })
  role: string;
  @ApiProperty({ example: "+1234567890", required: false })
  phoneNumber?: string;
  @ApiProperty({ example: "US", required: false })
  country?: string;
  @ApiProperty({ example: "/uploads/profile.jpg", required: false })
  imagePath?: string;
  @ApiProperty({ example: true })
  isVerified: boolean;
}
@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Customer login",
    description:
      "Authenticate customer with email and password. Returns JWT token and user information.",
  })
  @ApiBody({
    type: SigninDto,
    description: "Customer credentials",
    examples: {
      customer: {
        summary: "Customer Login",
        value: {
          email: "customer@example.com",
          password: "SecurePassword123",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      example: {
        success: true,
        data: {
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          tokenType: "Bearer",
          id: "user-uuid-here",
          email: "customer@example.com",
          displayName: "John Doe",
          role: "USER",
        },
        message: "Login successful",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials or unverified email",
    schema: {
      example: {
        success: false,
        data: null,
        message: "Please verify your email before signing in",
      },
    },
  })
  async login(@Body() signinDto: SigninDto): Promise<ApiResponseClass<any>> {
    return await this.authService.login(signinDto);
  }
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Customer registration",
    description:
      "Register a new customer account and send OTP for verification.",
  })
  @ApiBody({
    type: RegisterDto,
    description: "Customer registration data",
    examples: {
      customer: {
        summary: "Customer Registration",
        value: {
          email: "newcustomer@example.com",
          firstName: "John",
          lastName: "Doe",
          password: "SecurePassword123",
          phoneNumber: "+1234567890",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Registration initiated - OTP sent",
    type: RegisterResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message: "OTP sent to your email",
          email: "newcustomer@example.com",
        },
        message:
          "Registration initiated. Please check your email for OTP verification.",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation errors",
    schema: {
      example: {
        success: false,
        data: null,
        message: "Email already exists",
      },
    },
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponseClass<{ message: string; email: string }>> {
    return await this.authService.register(registerDto);
  }
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify OTP",
    description: "Verify the OTP sent to email to complete registration.",
  })
  @ApiBody({
    type: VerifyOtpDto,
    description: "OTP verification data",
    examples: {
      verifyOtp: {
        summary: "Verify OTP",
        value: {
          email: "customer@example.com",
          otp: "123456",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "OTP verified successfully",
    type: SigninResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        message: "Email verified successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired OTP",
    schema: {
      example: {
        success: false,
        data: null,
        message: "Invalid OTP",
      },
    },
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<ApiResponseClass<SigninResponse>> {
    return await this.authService.verifyOtp(verifyOtpDto);
  }
  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Resend OTP",
    description: "Resend OTP to email for verification.",
  })
  @ApiBody({
    description: "Email for OTP resend",
    examples: {
      resendOtp: {
        summary: "Resend OTP",
        value: {
          email: "customer@example.com",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "OTP resent successfully",
    schema: {
      example: {
        success: true,
        data: {
          message: "New OTP sent to your email",
        },
        message: "OTP resent successfully",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    schema: {
      example: {
        success: false,
        data: null,
        message: "User not found",
      },
    },
  })
  async resendOtp(
    @Body() resendOtpDto: ResendOtpDto,
  ): Promise<ApiResponseClass<{ message: string }>> {
    return await this.authService.resendOtp(resendOtpDto.email);
  }
  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Change password",
    description: "Change the current user password.",
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: "Password change data",
    examples: {
      changePassword: {
        summary: "Change Password",
        value: {
          oldPassword: "OldPassword123",
          newPassword: "NewSecurePassword123",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password changed successfully",
    schema: {
      example: {
        success: true,
        data: null,
        message: "Password changed successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid old password",
    schema: {
      example: {
        success: false,
        data: null,
        message: "Invalid old password",
      },
    },
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: User,
  ): Promise<ApiResponseClass<null>> {
    return await this.authService.changePassword(
      changePasswordDto,
      currentUser,
    );
  }
  @Post("delete-account")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete account",
    description: "Permanently delete the current user account (soft delete).",
  })
  @ApiBody({
    type: DeleteAccountDto,
    description: "Account deletion data",
    examples: {
      deleteAccount: {
        summary: "Delete Account",
        value: {
          password: "CurrentPassword123!",
          confirmation: "DELETE MY ACCOUNT",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Account deleted successfully",
    schema: {
      example: {
        success: true,
        data: null,
        message: "Account deleted successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid password or confirmation",
    schema: {
      example: {
        success: false,
        data: null,
        message: "Invalid password",
      },
    },
  })
  async deleteAccount(
    @Body() deleteAccountDto: DeleteAccountDto,
    @CurrentUser() currentUser: User,
  ): Promise<ApiResponseClass<null>> {
    return await this.authService.deleteAccount(deleteAccountDto, currentUser);
  }
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Forgot password",
    description: "Send password reset email to the provided email address.",
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: "Email for password reset",
    examples: {
      forgotPassword: {
        summary: "Forgot Password",
        value: {
          email: "customer@example.com",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent",
    schema: {
      example: {
        success: true,
        data: null,
        message: "Password reset email sent successfully",
      },
    },
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ApiResponseClass<null>> {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reset password",
    description: "Reset password using token from email.",
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: "Password reset data",
    examples: {
      resetPassword: {
        summary: "Reset Password",
        value: {
          email: "customer@example.com",
          password: "NewSecurePassword123",
          token: "reset-token-from-email",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password reset successful",
    schema: {
      example: {
        success: true,
        data: null,
        message: "Password reset successful",
      },
    },
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ApiResponseClass<null>> {
    return await this.authService.resetPassword(resetPasswordDto);
  }
  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh access token",
    description: "Get new access token using refresh token.",
  })
  @ApiBody({
    description: "Refresh token",
    examples: {
      refreshToken: {
        summary: "Refresh Token",
        value: {
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
    type: SigninResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        message: "Token refreshed successfully",
      },
    },
  })
  async refreshToken(
    @Body() body: { refreshToken: string },
  ): Promise<ApiResponseClass<SigninResponse>> {
    return await this.authService.refreshToken(body.refreshToken);
  }
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Logout",
    description: "Logout the current user.",
  })
  @ApiResponse({
    status: 200,
    description: "Logout successful",
    schema: {
      example: {
        success: true,
        data: null,
        message: "Logout successful",
      },
    },
  })
  async logout(
    @CurrentUser() currentUser: User,
    @Req() req: Request,
    @Body() body?: { refreshToken?: string },
  ): Promise<ApiResponseClass<null>> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    const refreshToken = body?.refreshToken;
    return await this.authService.logout(currentUser.id, token, refreshToken);
  }
  @Get("session")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user session",
    description:
      "Get current authenticated user session information. Returns user details and primary role.",
  })
  @ApiResponse({
    status: 200,
    description: "Session retrieved successfully",
    schema: {
      example: {
        success: true,
        data: {
          id: "user-uuid-here",
          email: "customer@example.com",
          displayName: "John Doe",
          role: "USER",
        },
        message: "Session retrieved successfully",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - authentication required",
    schema: {
      example: {
        success: false,
        data: null,
        message: "User not authenticated",
      },
    },
  })
  async getSession(
    @CurrentUser() currentUser: User,
  ): Promise<ApiResponseClass<any>> {
    return await this.authService.getSession(currentUser.id);
  }
  @Post("get-user-session")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get user session",
    description: "Get current user session information.",
  })
  @ApiResponse({
    status: 200,
    description: "User session retrieved successfully",
    type: UserSessionResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          id: "user-uuid-here",
          firstName: "John",
          lastName: "Doe",
          email: "customer@example.com",
          role: "customer",
          phoneNumber: "+1234567890",
          country: "US",
          imagePath: "/uploads/profile.jpg",
          isVerified: true,
        },
        message: "User session retrieved successfully",
      },
    },
  })
  async getUserSession(
    @CurrentUser() currentUser: User,
    @Req() req: Request,
  ): Promise<ApiResponseClass<UserSessionResponse>> {
    const userIP = this.extractUserIP(req);
    return await this.authService.getUserSession(currentUser.id, userIP);
  }
  private extractUserIP(req: Request): string {
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.headers["x-real-ip"]?.toString() ||
      req.headers["x-client-ip"]?.toString() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    return ip;
  }
}
