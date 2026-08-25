import { describe, expect, it } from "vitest";

import {
  calculateMinimumQuantity,
  calculateMinimumOrderAmount,
  normalizePrice,
  normalizeQuantity,
} from "../../src/server/exchanges/binance/BinanceFilters";

const filters = {
  symbol: "BTCUSDT",

  price: {
    minPrice: 0.01,
    maxPrice: 1000000,
    tickSize: 0.01,
  },

  lotSize: {
    minQty: 0.00001,
    maxQty: 1000,
    stepSize: 0.00001,
  },

  notional: {
    minNotional: 5,
  },
};

describe("Binance filters", () => {
  it("normalizes price according to tick size", () => {
    expect(
      normalizePrice(100.127, filters),
    ).toBe(100.12);
  });

  it("normalizes quantity according to step size", () => {
    expect(
      normalizeQuantity(0.123456, filters),
    ).toBe(0.12345);
  });

  it("calculates minimum quantity using notional", () => {
    const quantity =
      calculateMinimumQuantity(
        50000,
        filters,
      );

    expect(quantity * 50000).toBeGreaterThanOrEqual(5);
  });

  it("calculates minimum valid order amount", () => {
    const amount =
      calculateMinimumOrderAmount(
        50000,
        filters,
      );

    expect(amount).toBeGreaterThanOrEqual(5);
  });
});
