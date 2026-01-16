import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNotEmptyObject,
} from "class-validator";
import { Type } from "class-transformer";
import { CreateTipSelectionDto } from "./create-tip-selection.dto";

/**
 * DTO for creating a tip
 */
export class CreateTipDto {
  @ApiProperty({
    description: "Title of the tip",
    example: "EPL Weekend Acca",
    maxLength: 255,
  })
  @IsString({ message: "Title must be a string" })
  @IsNotEmpty({ message: "Title is required" })
  @MaxLength(255, { message: "Title must not exceed 255 characters" })
  title: string;

  @ApiProperty({
    description: "Description of the tip (optional)",
    example: "Top picks for this weekend's Premier League matches",
    required: false,
  })
  @IsString({ message: "Description must be a string" })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Price of the tip (minimum 0, free tips have price 0)",
    example: 10.5,
    minimum: 0,
    default: 0,
  })
  @IsNumber({}, { message: "Price must be a number" })
  @Min(0, { message: "Price must be at least 0" })
  price: number;

  @ApiProperty({
    description: "Array of match selections/predictions for this tip",
    type: [CreateTipSelectionDto],
    minItems: 1,
  })
  @IsArray({ message: "Selections must be an array" })
  @IsNotEmpty({ message: "At least one selection is required" })
  @ValidateNested({ each: true })
  @Type(() => CreateTipSelectionDto)
  selections: CreateTipSelectionDto[];
}
