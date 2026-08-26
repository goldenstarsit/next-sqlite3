import type {
  DcaConfig,
  DcaOrderConfig,
} from "./DcaConfig";

import {
  DcaStrategy,
} from "./DcaStrategy";

export interface DcaPrice {
  orderId: number;
  percentage: number;
  price: number;
}

export interface DcaAmount {
  buyAmount: number;
  sellAmount: number;
}

export class DcaEngine {
  private strategy: DcaStrategy;

  constructor(
    config: DcaConfig,
  ) {
    this.strategy =
      new DcaStrategy(config);
  }

  calculatePrices(
    initialEntryPrice: number,
  ): DcaPrice[] {
    if (
      initialEntryPrice <= 0
    ) {
      throw new Error(
        "Initial entry price must be greater than zero.",
      );
    }

    return this.strategy
      .getConfig()
      .orders
      .map((order, index) => ({
        orderId:
          order.id ??
          index + 1,

        percentage:
          order.percentageFromInitialEntry!,

        price:
          initialEntryPrice *
          (
            1 -
            order.percentageFromInitialEntry! /
              100
          ),
      }));
  }

  getMinimumOrderAmount(
    exchangeMinimumAmount: number,
  ): DcaAmount {
    if (
      exchangeMinimumAmount <= 0
    ) {
      throw new Error(
        "Exchange minimum amount must be greater than zero.",
      );
    }

    const config =
      this.strategy.getConfig();

    return {
      buyAmount:
        config.buyAmount ??
        (
          config.minimumOrderMode ===
          "fixed"
            ? config.minimumOrderAmount ??
              exchangeMinimumAmount
            : exchangeMinimumAmount
        ),

      sellAmount:
        config.sellAmount ??
        (
          config.minimumOrderMode ===
          "fixed"
            ? config.minimumOrderAmount ??
              exchangeMinimumAmount
            : exchangeMinimumAmount
        ),
    };
  }

  getOrder(
    orderId: number,
  ): DcaOrderConfig | undefined {
    return this.strategy
      .getConfig()
      .orders
      .find(
        (order, index) =>
          (
            order.id ??
            index + 1
          ) === orderId,
      );
  }
}
