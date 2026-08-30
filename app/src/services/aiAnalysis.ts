import type { AIAnalysis, AIAnalysisPreview, AISentiment, AIVerdict } from '../types/aiAnalysis';
import type { Market } from '../types/market';

const clamp = (value: number, minimum = 1, maximum = 99) => Math.min(maximum, Math.max(minimum, Math.round(value)));
const hashMarket = (market: Market) => [...market.id].reduce((total, character) => total + character.charCodeAt(0), 0);

function getFocusedOutcome(market: Market) {
  if (market.category === 'Crypto') return market.outcomes.find((outcome) => outcome.tradeAction === 'Buy') ?? market.outcomes[0]!;
  return market.outcomes[0]!;
}

function getVerdict(edge: number): AIVerdict {
  if (edge >= 8) return 'strong_yes';
  if (edge >= 3) return 'lean_yes';
  if (edge <= -8) return 'strong_no';
  if (edge <= -3) return 'lean_no';
  return 'neutral';
}

export function getAIAnalysisPreview(market: Market): AIAnalysisPreview {
  const focusedOutcome = getFocusedOutcome(market);
  const possibleEdges = [6, 4, -3, 8, 2, 5];
  const edge = market.id === 'bitcoin-2026' ? 6 : possibleEdges[hashMarket(market) % possibleEdges.length]!;
  const probability = clamp(focusedOutcome.probability + edge);
  return {
    focusedOutcome: focusedOutcome.label,
    marketProbability: focusedOutcome.probability,
    probability,
    edge: probability - focusedOutcome.probability,
    confidence: Math.abs(edge) >= 8 ? 'high' : Math.abs(edge) >= 4 ? 'medium' : 'low',
    verdict: getVerdict(edge),
  };
}

const signalNames: Record<Market['category'], { name: string; explanation: string }[]> = {
  Crypto: [
    { name: 'On-chain activity', explanation: 'Wallet flows and network activity remain constructive.' },
    { name: 'Social sentiment', explanation: 'Conversation momentum is positive but not at an extreme.' },
    { name: 'Price momentum', explanation: 'Recent structure supports the current directional view.' },
    { name: 'Macro conditions', explanation: 'Rates and risk appetite remain the largest external constraint.' },
    { name: 'News', explanation: 'Recent coverage is moderately supportive of the thesis.' },
  ],
  Sports: [
    { name: 'Recent form', explanation: 'Recent performance supports the model estimate.' },
    { name: 'Squad availability', explanation: 'Known availability has been included in the confidence score.' },
    { name: 'Head-to-head', explanation: 'Historical matchups provide a modest directional signal.' },
    { name: 'Market liquidity', explanation: 'Available market depth supports a stable comparison.' },
    { name: 'Consensus', explanation: 'Public and market expectations broadly align with this view.' },
  ],
  Recommend: [
    { name: 'News', explanation: 'Recent reporting provides a moderately supportive signal.' },
    { name: 'Public sentiment', explanation: 'Current discussion leans in the model’s direction.' },
    { name: 'Fundamentals', explanation: 'Available underlying evidence supports the base case.' },
    { name: 'Market liquidity', explanation: 'Market depth is sufficient for a useful probability comparison.' },
    { name: 'Macro conditions', explanation: 'Broader conditions add uncertainty to the long-range outlook.' },
  ],
};

function sentimentFor(score: number, category: Market['category']): AISentiment {
  if (score >= 62) return category === 'Crypto' ? 'bullish' : 'positive';
  if (score <= 42) return category === 'Crypto' ? 'bearish' : 'negative';
  return 'neutral';
}

function risksFor(market: Market) {
  if (market.category === 'Crypto') return ['Significant exchange inflows', 'A major risk-off macro event', 'Sharp deterioration in market liquidity', 'Negative regulatory or geopolitical news'];
  if (market.category === 'Sports') return ['Late lineup or injury changes', 'Unexpected tactical changes', 'Postponement or event cancellation', 'A rapid shift in market liquidity'];
  return ['A major breaking-news event', 'Material changes in candidate or participant status', 'A sharp shift in public sentiment', 'Lower market liquidity or incomplete reporting'];
}

export async function analyzeMarket(market: Market): Promise<AIAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 2200));
  const preview = getAIAnalysisPreview(market);
  const offsets = [8, 3, 6, -10, 1];
  const baseScore = 52 + preview.edge * 2;
  const signals = signalNames[market.category].map((signal, index) => {
    const score = clamp(baseScore + offsets[index]!, 18, 88);
    return { ...signal, score, sentiment: sentimentFor(score, market.category) };
  });
  const sentimentScore = Math.round(signals.reduce((total, signal) => total + signal.score, 0) / signals.length);
  const direction = preview.edge >= 0 ? 'above' : 'below';

  return {
    marketId: market.id,
    ...preview,
    sentimentScore,
    signals,
    summary: `PredictAI places “${preview.focusedOutcome}” at ${preview.probability}%, ${Math.abs(preview.edge)} points ${direction} the market. The available signals are broadly ${preview.edge >= 0 ? 'supportive' : 'cautious'}, while uncertainty in ${market.category === 'Crypto' ? 'macro conditions and liquidity' : market.category === 'Sports' ? 'late team information and match conditions' : 'future news and public sentiment'} limits conviction.`,
    risks: risksFor(market),
    updatedAt: new Date().toISOString(),
  };
}
