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
 * DTO for adding/updating a selection to a tip
 */
export class AddSelectionDto {
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
    description: "Odds for this prediction",
    example: 2.5,
    minimum: 1.0,
  })
  @IsNumber({}, { message: "Odds must be a number" })
  @Min(1.0, { message: "Odds must be at least 1.0" })
  odds: number;

  @ApiProperty({
    description: "Bet line (for handicap selections)",
    example: -1.5,
    required: false,
  })
  @IsNumber({}, { message: "Bet line must be a number" })
  @IsOptional()
  betLine?: number;
}
