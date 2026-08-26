export interface RotationSymbolConfig {
  symbol: string;
  enabled: boolean;
}

export interface RotationConfig {
  enabled: boolean;

  symbols: RotationSymbolConfig[];

  takeProfitPercent: number;

  maxDurationSeconds: number;

  variationWeight: number;

  takeProfitProbabilityWeight: number;

  sampleWindows: {
    secondSamples: number;
    minuteSamples: number;
    hourSamples: number;
    daySamples: number;
  };
}
