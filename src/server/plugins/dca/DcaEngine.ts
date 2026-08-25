import type {
  DcaConfig,
  DcaOrderConfig,
} from "./DcaConfig";

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
  constructor(
    private readonly config: DcaConfig,
  ) {}

  calculatePrices(
    initialEntryPrice: number,
  ): DcaPrice[] {
    if (initialEntryPrice <= 0) {
      throw new Error(
        "Initial entry price must be greater than zero.",
      );
    }

    return this.config.orders
      .filter((order) => order.enabled)
      .map((order) => ({
        orderId: order.id,
        percentage: order.percentage,
        price:
          initialEntryPrice *
          (1 - order.percentage / 100),
      }));
  }

  getMinimumOrderAmount(
    exchangeMinimumAmount: number,
  ): DcaAmount {
    if (exchangeMinimumAmount <= 0) {
      throw new Error(
        "Exchange minimum amount must be greater than zero.",
      );
    }

    return {
      buyAmount:
        this.config.buyAmount ??
        exchangeMinimumAmount,

      sellAmount:
        this.config.sellAmount ??
        exchangeMinimumAmount,
    };
  }

  getOrder(
    orderId: number,
  ): DcaOrderConfig | undefined {
    return this.config.orders.find(
      (order) => order.id === orderId,
    );
  }
}
