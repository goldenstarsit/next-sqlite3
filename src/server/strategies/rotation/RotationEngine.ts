import type { RotationConfig } from "./RotationConfig";
import {
  RotationPriceStore,
} from "./RotationPriceStore";
import {
  RotationIndicators,
} from "./RotationIndicators";
import {
  RotationForecastEngine,
} from "./RotationForecast";
import {
  RotationRanking,
  type RotationCandidate,
} from "./RotationRanking";

export class RotationEngine {
  readonly priceStore =
    new RotationPriceStore();

  private readonly indicators =
    new RotationIndicators();

  private readonly forecast =
    new RotationForecastEngine();

  private readonly ranking =
    new RotationRanking();

  constructor(
    private config: RotationConfig,
  ) {}

  updateConfig(
    config: RotationConfig,
  ): void {
    this.config = structuredClone(config);
  }

  addPrice(
    symbol: string,
    price: number,
    timestamp?: number,
  ): void {
    this.priceStore.addPrice(
      symbol,
      price,
      timestamp,
    );
  }

  getRanking(): RotationCandidate[] {
    const candidates: RotationCandidate[] = [];

    for (const symbolConfig of this.config.symbols) {
      if (!symbolConfig.enabled) {
        continue;
      }

      const averages =
        this.priceStore.getAverages(
          symbolConfig.symbol,
        );

      if (!averages) {
        continue;
      }

      const indicatorResult =
        this.indicators.calculate(
          averages,
        );

      const forecast =
        this.forecast.calculate(
          indicatorResult.realPrice,
          indicatorResult.expectedPrice,
          this.config.takeProfitPercent,
          this.config.maxDurationSeconds,
        );

      candidates.push({
        symbol: symbolConfig.symbol,
        variationPercent:
          indicatorResult.variationPercent,
        takeProfitProbability:
          forecast.probability,
        score: 0,
      });
    }

    return this.ranking.rank(
      candidates,
      this.config.variationWeight,
      this.config.takeProfitProbabilityWeight,
    );
  }

  getCandidate():
    RotationCandidate | undefined {
    return this.getRanking()[0];
  }
}
