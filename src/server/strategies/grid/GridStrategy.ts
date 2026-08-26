import type {
  StrategyContext,
  StrategyOrder,
  TradingStrategy,
} from "../core/types";

import type { GridConfig } from "./GridConfig";

const DEFAULT_CONFIG: GridConfig = {
  enabled: true,

  lowerPrice: 0,
  upperPrice: 0,

  gridCount: 10,

  orderAmountPercentage: 100,

  minimumOrderMode: "exchange-minimum",
};

export class GridStrategy
  implements TradingStrategy<GridConfig>
{
  readonly id = "grid";
  readonly name = "Grid";

  private config: GridConfig;

  constructor(config?: Partial<GridConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.validateConfig(this.config);
  }

  getConfig(): GridConfig {
    return structuredClone(this.config);
  }

  updateConfig(config: GridConfig): void {
    this.validateConfig(config);
    this.config = structuredClone(config);
  }

  validateConfig(config: GridConfig): void {
    if (
      !Number.isFinite(config.lowerPrice) ||
      config.lowerPrice <= 0
    ) {
      throw new Error(
        "Grid lower price must be greater than 0.",
      );
    }

    if (
      !Number.isFinite(config.upperPrice) ||
      config.upperPrice <=
        config.lowerPrice
    ) {
      throw new Error(
        "Grid upper price must be greater than lower price.",
      );
    }

    if (
      !Number.isInteger(config.gridCount) ||
      config.gridCount < 2
    ) {
      throw new Error(
        "Grid count must be at least 2.",
      );
    }

    if (
      !Number.isFinite(
        config.orderAmountPercentage,
      ) ||
      config.orderAmountPercentage <= 0
    ) {
      throw new Error(
        "Grid order amount percentage must be greater than 0.",
      );
    }
  }

  calculateOrders(
    context: StrategyContext,
  ): StrategyOrder[] {
    if (!this.config.enabled) {
      return [];
    }

    const range =
      this.config.upperPrice -
      this.config.lowerPrice;

    const step =
      range /
      (this.config.gridCount - 1);

    const orders: StrategyOrder[] = [];

    for (
      let index = 0;
      index < this.config.gridCount;
      index++
    ) {
      const price =
        this.config.lowerPrice +
        step * index;

      const side =
        price < context.currentPrice
          ? "BUY"
          : "SELL";

      orders.push({
        symbol: context.symbol,
        side,
        price,
        quoteAmount:
          this.config.orderAmountPercentage,
        level: index + 1,
        reason:
          `Grid level ${index + 1}`,
      });
    }

    return orders;
  }
}

export function createGridStrategy(
  config?: Record<string, unknown>,
): GridStrategy {
  return new GridStrategy(
    config as Partial<GridConfig> | undefined,
  );
}
