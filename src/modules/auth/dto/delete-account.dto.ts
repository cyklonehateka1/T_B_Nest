import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'CurrentPassword123!',
    description: 'Current password for verification before account deletion',
    type: String,
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Password is required for account deletion' })
  password: string;

  @ApiProperty({
    example: 'DELETE MY ACCOUNT',
    description:
      'Confirmation message acknowledging the irreversible nature of account deletion',
    type: String,
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Confirmation message is required' })
  confirmation: string;
}
