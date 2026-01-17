import { ApiProperty } from "@nestjs/swagger";
import {
  IsUUID,
  IsString,
  IsNumber,
  Min,
  IsNotEmpty,
  IsOptional,
} from "class-validator";

/**
 * DTO for creating a tip selection (match prediction within a tip)
 */
export class CreateTipSelectionDto {
  @ApiProperty({
    description: "UUID of the match",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "Match ID must be a valid UUID" })
  @IsNotEmpty({ message: "Match ID is required" })
  matchId: string;

  @ApiProperty({
    description: "Prediction value (e.g., 'home_win', 'over_2.5', 'btts_yes')",
    example: "home_win",
  })
  @IsString({ message: "Prediction must be a string" })
  @IsNotEmpty({ message: "Prediction is required" })
  prediction: string;

  @ApiProperty({
    description: "Odds for this prediction (optional, can be null)",
    example: 2.5,
    required: false,
    nullable: true,
  })
  @IsNumber({}, { message: "Odds must be a number" })
  @IsOptional()
  odds?: number | null;
}
