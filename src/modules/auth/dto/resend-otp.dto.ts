import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({
    description: 'User email address for OTP resend',
    example: 'customer@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
