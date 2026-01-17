import { ApiProperty } from "@nestjs/swagger";
import { TipsterBasicInfoDto } from "./tip-response.dto";
export class TipSelectionEditingDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  matchId: string;
  @ApiProperty({ example: "match_result" })
  predictionType: string;
  @ApiProperty({ example: "home_win" })
  predictionValue: string;
  @ApiProperty({ example: 2.5 })
  odds?: number;
  @ApiProperty({ example: false })
  isVoid: boolean;
}
export class TipEditingResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;
  @ApiProperty({ example: "EPL Weekend Acca" })
  title: string;
  @ApiProperty({ example: "Top picks for the weekend", required: false })
  description?: string | null;
  @ApiProperty({ example: 10.5 })
  price: number;
  @ApiProperty({ example: 15.75, required: false })
  totalOdds?: number | null;
  @ApiProperty({ example: "PENDING" })
  status: string;
  @ApiProperty({ example: 0 })
  purchasesCount: number;
  @ApiProperty({ example: "2024-01-15T15:00:00Z", required: false })
  earliestMatchDate?: Date | null;
  @ApiProperty({ example: "2024-01-10T08:00:00Z" })
  createdAt: Date;
  @ApiProperty({ type: [TipSelectionEditingDto] })
  selections: TipSelectionEditingDto[];
  @ApiProperty({ type: TipsterBasicInfoDto, required: false })
  tipster?: TipsterBasicInfoDto | null;
}
