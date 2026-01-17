import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email address associated with the reset token",
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "NewSecurePassword123",
    description: "New password (minimum 8 characters)",
    type: String,
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: "reset_token_from_email",
    description: "Reset token received via email",
    type: String,
  })
  @IsString()
  token: string;
}
