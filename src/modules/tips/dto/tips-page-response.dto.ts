import { ApiProperty } from "@nestjs/swagger";
import { TipResponseDto } from "./tip-response.dto";

export class TipsPageResponseDto {
  @ApiProperty({ type: [TipResponseDto] })
  tips: TipResponseDto[];

  @ApiProperty({ example: 150 })
  totalElements: number;

  @ApiProperty({ example: 8 })
  totalPages: number;

  @ApiProperty({ example: 0 })
  currentPage: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 25, description: "Count of tips with price = 0" })
  freeTipsCount: number;

  @ApiProperty({
    example: 120,
    description: "Count of tips where all matches are still valid (scheduled and not started)",
  })
  availableTipsCount: number;
}
