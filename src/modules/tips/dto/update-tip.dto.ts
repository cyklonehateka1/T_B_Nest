import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from "class-validator";
export class UpdateTipDto {
  @ApiProperty({
    description: "Title of the tip",
    example: "EPL Weekend Acca",
    maxLength: 255,
    required: false,
  })
  @IsString({ message: "Title must be a string" })
  @IsOptional()
  @MaxLength(255, { message: "Title must not exceed 255 characters" })
  title?: string;
  @ApiProperty({
    description: "Description of the tip (optional)",
    example: "Top picks for this weekend's Premier League matches",
    required: false,
  })
  @IsString({ message: "Description must be a string" })
  @IsOptional()
  description?: string;
  @ApiProperty({
    description: "Price of the tip (0 for free, 1-100 USD for paid tips)",
    example: 10.5,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsNumber({}, { message: "Price must be a number" })
  @IsOptional()
  @Min(0, { message: "Price must be at least 0" })
  @Max(100, { message: "Price must not exceed 100 USD" })
  price?: number;
}
