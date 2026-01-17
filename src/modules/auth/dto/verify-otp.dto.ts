import { IsEmail, IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
export class VerifyOtpDto {
  @ApiProperty({
    description: "User email address",
    example: "customer@example.com",
  })
  @IsEmail()
  email: string;
  @ApiProperty({
    description: "6-digit OTP code sent to email",
    example: "123456",
  })
  @IsString()
  @Length(6, 6)
  otp: string;
}
