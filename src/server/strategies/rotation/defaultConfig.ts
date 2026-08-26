import type { RotationConfig } from "./RotationConfig";

export const defaultRotationConfig: RotationConfig = {
  enabled: true,

  symbols: [
    { symbol: "BTCUSDT", enabled: true },
    { symbol: "ETHUSDT", enabled: true },
    { symbol: "BNBUSDT", enabled: true },
    { symbol: "SOLUSDT", enabled: true },
    { symbol: "XRPUSDT", enabled: true },
  ],

  takeProfitPercent: 1,

  maxDurationSeconds: 3600,

  variationWeight: 0.7,

  takeProfitProbabilityWeight: 0.3,

  sampleWindows: {
    secondSamples: 60,
    minuteSamples: 60,
    hourSamples: 24,
    daySamples: 7,
  },
};
