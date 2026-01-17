import { IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
export class ForgotPasswordDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email address to send password reset link",
    type: String,
  })
  @IsEmail()
  email: string;
}
