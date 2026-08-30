export type AIVerdict = 'strong_yes' | 'lean_yes' | 'neutral' | 'lean_no' | 'strong_no';
export type AIConfidence = 'low' | 'medium' | 'high';
export type AISentiment = 'bullish' | 'bearish' | 'positive' | 'negative' | 'neutral';

export type AISignal = {
  name: string;
  score: number;
  sentiment: AISentiment;
  explanation: string;
};

export type AIAnalysis = {
  marketId: string;
  focusedOutcome: string;
  verdict: AIVerdict;
  probability: number;
  marketProbability: number;
  edge: number;
  confidence: AIConfidence;
  sentimentScore: number;
  summary: string;
  signals: AISignal[];
  risks: string[];
  updatedAt: string;
};

export type AIAnalysisPreview = Pick<AIAnalysis, 'confidence' | 'edge' | 'focusedOutcome' | 'marketProbability' | 'probability' | 'verdict'>;
