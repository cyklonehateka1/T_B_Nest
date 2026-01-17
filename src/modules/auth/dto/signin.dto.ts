import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
export class SigninDto {
  @ApiProperty({
    example: "user@tipster.com",
    description: "User email address",
    type: String,
  })
  @IsEmail()
  email: string;
  @ApiProperty({
    example: "Admin@123",
    description: "User password (minimum 8 characters)",
    type: String,
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
