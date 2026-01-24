import { PredictionType } from "../../../common/enums/prediction-type.enum";

export interface AiTipSelection {
  matchId: string;
  predictionType: PredictionType;
  predictionValue: string;
  odds: number;
  confidence: number;
  reasoning: string;
}

export interface AiTipResponse {
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  selections: AiTipSelection[];
  totalOdds: number;
}

export interface ParsedTip {
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  selections: Array<{
    matchId: string;
    predictionType: PredictionType;
    predictionValue: string;
    odds: number;
    confidence: number;
    reasoning: string;
  }>;
  totalOdds: number;
}
