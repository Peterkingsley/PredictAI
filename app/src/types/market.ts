export type Outcome = {
  label: string;
  probability: number;
  odds: string;
  color?: string;
  tradeAction?: 'Buy' | 'Sell';
};
export type Market = {
  id: string;
  title: string;
  category: 'Recommend' | 'Sports' | 'Crypto';
  subcategory: string;
  volume: string;
  more: number;
  outcomes: Outcome[];
  rules: string;
};
