import type { Market, MarketPoint } from "../models/domain.js";
import { now } from "../core/utils.js";
const standardRules =
  "The market resolves from the official source named by the event. If no official result is available, a consensus of credible reporting may be used.";
const cryptoRules =
  "This market resolves from the high or low of the named reference pair using one-minute candles through the closing date. Other exchanges and pairs are excluded.";
const future = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();
const past = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString();
export const marketFixtures: Market[] = [
  {
    id: "dem-2028",
    title: "Democratic Presidential Nominee 2028",
    category: "Recommend",
    subcategory: "Hot",
    volume: "1270000000.00",
    status: "open",
    outcomes: [
      {
        id: "aoc",
        label: "Alexandria Ocasio-Cortez",
        odds: "4.78x",
        probabilityBps: 2100,
      },
      {
        id: "ossoff",
        label: "Jon Ossoff",
        odds: "6.75x",
        probabilityBps: 1500,
      },
    ],
    rules: standardRules,
    opensAt: past(30),
    closesAt: future(700),
    revision: 1,
    updatedAt: now(),
  },
  {
    id: "president-2028",
    title: "Presidential Election Winner 2028",
    category: "Recommend",
    subcategory: "Hot",
    volume: "693100000.00",
    status: "open",
    outcomes: [
      { id: "vance", label: "JD Vance", odds: "4.28x", probabilityBps: 2300 },
      {
        id: "aoc",
        label: "Alexandria Ocasio-Cortez",
        odds: "7.06x",
        probabilityBps: 1400,
      },
    ],
    rules: standardRules,
    opensAt: past(50),
    closesAt: future(750),
    revision: 1,
    updatedAt: now(),
  },
  {
    id: "rep-2028",
    title: "Republican Presidential Nominee 2028",
    category: "Recommend",
    subcategory: "Hot",
    volume: "691700000.00",
    status: "open",
    outcomes: [
      { id: "vance", label: "J.D. Vance", odds: "2.11x", probabilityBps: 4700 },
      {
        id: "rubio",
        label: "Marco Rubio",
        odds: "5.15x",
        probabilityBps: 1900,
      },
    ],
    rules: standardRules,
    opensAt: past(45),
    closesAt: future(680),
    revision: 1,
    updatedAt: now(),
  },
  {
    id: "henan",
    title: "Wuhan San Zhen FC vs. Henan FC",
    category: "Sports",
    subcategory: "Soccer",
    volume: "1740.00",
    status: "open",
    outcomes: [
      {
        id: "henan",
        label: "Henan FC",
        odds: "1.14x",
        probabilityBps: 8700,
        color: "#1677ff",
      },
      {
        id: "draw",
        label: "Draw",
        odds: "1.28x",
        probabilityBps: 7800,
        color: "#ff7b3b",
      },
      {
        id: "wuhan",
        label: "Wuhan San Zhen FC",
        odds: "10.00x",
        probabilityBps: 1000,
        color: "#43c6d5",
      },
    ],
    rules: standardRules,
    opensAt: past(2),
    closesAt: future(5),
    revision: 1,
    updatedAt: now(),
  },
  {
    id: "bitcoin-2026",
    title: "What price will Bitcoin hit in 2026?",
    category: "Crypto",
    subcategory: "Target Price",
    volume: "60540000.00",
    status: "open",
    outcomes: [
      {
        id: "down-75000",
        label: "↓ 75,000",
        odds: "1.14x",
        probabilityBps: 8700,
        tradeAction: "Sell",
        color: "#1677ff",
      },
      {
        id: "down-70000",
        label: "↓ 70,000",
        odds: "1.51x",
        probabilityBps: 6600,
        tradeAction: "Sell",
        color: "#ff7b3b",
      },
      {
        id: "up-85000",
        label: "↑ 85,000",
        odds: "1.61x",
        probabilityBps: 6200,
        tradeAction: "Buy",
        color: "#43c6d5",
      },
      {
        id: "up-90000",
        label: "↑ 90,000",
        odds: "2.33x",
        probabilityBps: 4300,
        tradeAction: "Buy",
        color: "#9e91ee",
      },
    ],
    rules: cryptoRules,
    opensAt: past(20),
    closesAt: future(120),
    revision: 1,
    updatedAt: now(),
  },
  {
    id: "bitcoin-august",
    title: "What price will Bitcoin hit in August?",
    category: "Crypto",
    subcategory: "Target Price",
    volume: "21990000.00",
    status: "open",
    outcomes: [
      {
        id: "down-77500",
        label: "↓ 77,500",
        odds: "1.25x",
        probabilityBps: 8000,
        tradeAction: "Sell",
      },
      {
        id: "up-80000",
        label: "↑ 80,000",
        odds: "1.53x",
        probabilityBps: 6500,
        tradeAction: "Buy",
      },
    ],
    rules: cryptoRules,
    opensAt: past(10),
    closesAt: future(25),
    revision: 1,
    updatedAt: now(),
  },
  {
    id: "ethereum-2026",
    title: "What price will Ethereum hit in 2026?",
    category: "Crypto",
    subcategory: "Target Price",
    volume: "12690000.00",
    status: "open",
    outcomes: [
      {
        id: "down-2250",
        label: "↓ 2,250",
        odds: "1.29x",
        probabilityBps: 7800,
        tradeAction: "Sell",
      },
      {
        id: "up-2750",
        label: "↑ 2,750",
        odds: "1.49x",
        probabilityBps: 6700,
        tradeAction: "Buy",
      },
    ],
    rules: cryptoRules,
    opensAt: past(12),
    closesAt: future(120),
    revision: 1,
    updatedAt: now(),
  },
];
export const marketHistoryFixtures = new Map<string, MarketPoint[]>(
  marketFixtures.map((m, i) => [
    m.id,
    Array.from({ length: 24 }, (_, x) => ({
      at: new Date(Date.now() - (23 - x) * 3_600_000).toISOString(),
      probabilities: Object.fromEntries(
        m.outcomes.map((o, j) => [
          o.id,
          Math.max(
            100,
            Math.min(9900, o.probabilityBps + (((x + j + i) % 7) - 3) * 45),
          ),
        ]),
      ),
    })),
  ]),
);
