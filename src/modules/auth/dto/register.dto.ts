import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    example: "newadmin@example.com",
    description: "User email address (must match invite email)",
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "John",
    description: "User first name",
    type: String,
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "User last name",
    type: String,
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    example: "SecurePassword123",
    description: "User password (minimum 8 characters)",
    type: String,
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: "+1234567890",
    description: "User phone number",
    type: String,
  })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    example: "GH",
    description: "User country code (ISO 3166-1 alpha-2)",
    type: String,
  })
  @IsString()
  country: string;

  @ApiProperty({
    example: "REF123456",
    description: "Optional referral code",
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
