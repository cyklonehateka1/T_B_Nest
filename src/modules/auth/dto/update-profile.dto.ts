import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  Matches,
} from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({
    description: "First name",
    example: "John",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({
    description: "Last name",
    example: "Doe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    description: "Display name",
    example: "JohnDoe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({
    description: "Phone number",
    example: "+1234567890",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({
    description: "Avatar URL",
    example: "https://example.com/avatar.jpg",
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    description: "About me / Bio",
    example: "I am a passionate football tipster with years of experience...",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aboutMe?: string;

  @ApiProperty({
    description: "Account number for bank transfers",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiProperty({
    description: "Account name for bank transfers",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountName?: string;

  @ApiProperty({
    description: "Bank code",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankCode?: string;

  @ApiProperty({
    description: "Bank name",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;
}
