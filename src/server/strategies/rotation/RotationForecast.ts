export interface RotationForecast {
  takeProfitPrice: number;
  probability: number;
}

export class RotationForecastEngine {
  calculate(
    currentPrice: number,
    expectedPrice: number,
    takeProfitPercent: number,
    maxDurationSeconds: number,
  ): RotationForecast {
    if (
      currentPrice <= 0 ||
      expectedPrice <= 0
    ) {
      return {
        takeProfitPrice: 0,
        probability: 0,
      };
    }

    const takeProfitPrice =
      currentPrice *
      (1 + takeProfitPercent / 100);

    /*
     * Simple deterministic forecast for the strategy
     * foundation. Positive expected-price deviation
     * increases the probability of reaching TP.
     */
    const upside =
      (
        (expectedPrice - currentPrice) /
        currentPrice
      ) * 100;

    const durationFactor =
      Math.max(
        0,
        Math.min(
          1,
          maxDurationSeconds / 3600,
        ),
      );

    const probability =
      Math.max(
        0,
        Math.min(
          1,
          (upside /
            Math.max(takeProfitPercent, 0.000001)) *
            durationFactor,
        ),
      );

    return {
      takeProfitPrice,
      probability,
    };
  }
}
