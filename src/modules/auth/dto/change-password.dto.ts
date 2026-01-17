import { IsString, MinLength, Matches, Validate } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    example: "NewSecurePassword456!",
    description:
      "New password (minimum 8 characters, must contain uppercase, lowercase, number, and symbol)",
    type: String,
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
  })
  newPassword: string;

  @ApiProperty({
    example: "CurrentPassword123!",
    description: "Current password for verification",
    type: String,
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: "Current password is required" })
  oldPassword: string;
}
