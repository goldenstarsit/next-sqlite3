import type {
  StrategyContext,
  StrategyOrder,
  TradingStrategy,
} from "../core/types";

import type {
  DcaConfig,
  DcaOrderConfig,
} from "./DcaConfig";

const DEFAULT_CONFIG: DcaConfig = {
  enabled: true,

  orders: [
    {
      percentageFromInitialEntry: 2,
      amountPercentage: 100,
    },
    {
      percentageFromInitialEntry: 4,
      amountPercentage: 100,
    },
    {
      percentageFromInitialEntry: 6,
      amountPercentage: 100,
    },
  ],

  defaultAmountPercentage: 100,

  minimumOrderMode:
    "exchange-minimum",
};

export class DcaStrategy
  implements TradingStrategy<DcaConfig>
{
  readonly id = "dca";
  readonly name = "DCA";

  protected config: DcaConfig;

  constructor(
    config?: Partial<DcaConfig>,
  ) {
    this.config =
      DcaStrategy.normalizeConfig({
        ...DEFAULT_CONFIG,
        ...config,
        orders:
          config?.orders ??
          DEFAULT_CONFIG.orders,
      });

    this.validateConfig(
      this.config,
    );
  }

  getConfig(): DcaConfig {
    return structuredClone(
      this.config,
    );
  }

  updateConfig(
    config: DcaConfig,
  ): void {
    const normalized =
      DcaStrategy.normalizeConfig(
        config,
      );

    this.validateConfig(
      normalized,
    );

    this.config =
      structuredClone(normalized);
  }

  validateConfig(
    config: DcaConfig,
  ): void {
    if (
      !Array.isArray(config.orders)
    ) {
      throw new Error(
        "DCA orders must be an array.",
      );
    }

    const amountPercentage =
      config.defaultAmountPercentage ??
      100;

    if (
      !Number.isFinite(
        amountPercentage,
      ) ||
      amountPercentage <= 0
    ) {
      throw new Error(
        "DCA default amount percentage must be greater than 0.",
      );
    }

    for (
      let index = 0;
      index < config.orders.length;
      index++
    ) {
      const order =
        config.orders[index];

      const percentage =
        order.percentageFromInitialEntry;

      const amount =
        order.amountPercentage ??
        amountPercentage;

      if (
        percentage === undefined ||
        !Number.isFinite(
          percentage,
        ) ||
        percentage <= 0
      ) {
        throw new Error(
          `DCA order ${index + 1} percentage must be greater than 0.`,
        );
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          `DCA order ${index + 1} amount percentage must be greater than 0.`,
        );
      }
    }
  }

  calculateOrders(
    context: StrategyContext,
  ): StrategyOrder[] {
    if (!this.config.enabled) {
      return [];
    }

    const entry =
      context.initialEntryPrice;

    if (
      entry === undefined ||
      entry <= 0
    ) {
      return [];
    }

    return this.config.orders.map(
      (order, index) => {
        const percentage =
          order.percentageFromInitialEntry!;

        return {
          symbol: context.symbol,
          side: "BUY",
          price:
            entry *
            (1 - percentage / 100),

          quoteAmount:
            order.amountPercentage ??
            this.config
              .defaultAmountPercentage ??
            100,

          level: index + 1,

          reason:
            `DCA ${index + 1}: ` +
            `${percentage}% below initial entry`,
        };
      },
    );
  }

  static normalizeConfig(
    config: DcaConfig,
  ): DcaConfig {
    const orders =
      config.orders.map(
        (order) => ({
          ...order,

          percentageFromInitialEntry:
            order.percentageFromInitialEntry ??
            order.percentage ??
            0,

          amountPercentage:
            order.amountPercentage ??
            config.defaultAmountPercentage ??
            100,
        }),
      );

    return {
      ...config,
      orders,

      defaultAmountPercentage:
        config.defaultAmountPercentage ??
        100,

      minimumOrderMode:
        config.minimumOrderMode ??
        (
          config.useMinimumExchangeAmount ===
          false
            ? "fixed"
            : "exchange-minimum"
        ),
    };
  }
}

export function createDcaStrategy(
  config?: Record<string, unknown>,
): DcaStrategy {
  return new DcaStrategy(
    config as Partial<DcaConfig> | undefined,
  );
}
