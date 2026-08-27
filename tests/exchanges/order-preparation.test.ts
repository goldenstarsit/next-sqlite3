import { describe, expect, it } from "vitest";

import {
  normalizeOrderQuantity,
  normalizeOrderPrice,
  validateOrderNotional,
  prepareOrder,
} from "../../src/server/exchanges/core/OrderRules";

describe("Exchange Independent Order Preparation", () => {
  it("normalizes quantity using stepSize", () => {
    expect(
      normalizeOrderQuantity(1.237, {
        stepSize: 0.01,
      }),
    ).toBe(1.23);
  });

  it("rejects quantity below minQty", () => {
    expect(() =>
      normalizeOrderQuantity(0.005, {
        stepSize: 0.001,
        minQty: 0.01,
      }),
    ).toThrow(
      "Order quantity is below minimum quantity: 0.01",
    );
  });

  it("rejects quantity above maxQty", () => {
    expect(() =>
      normalizeOrderQuantity(11, {
        maxQty: 10,
      }),
    ).toThrow(
      "Order quantity exceeds maximum quantity: 10",
    );
  });

  it("normalizes price using tickSize", () => {
    expect(
      normalizeOrderPrice(100.126, {
        tickSize: 0.01,
      }),
    ).toBe(100.13);
  });

  it("rejects price below minPrice", () => {
    expect(() =>
      normalizeOrderPrice(5, {
        minPrice: 10,
      }),
    ).toThrow(
      "Order price is below minimum price: 10",
    );
  });

  it("rejects price above maxPrice", () => {
    expect(() =>
      normalizeOrderPrice(105, {
        maxPrice: 100,
      }),
    ).toThrow(
      "Order price exceeds maximum price: 100",
    );
  });

  it("validates minimum notional", () => {
    expect(() =>
      validateOrderNotional(0.001, 100, {
        minNotional: 1,
      }),
    ).toThrow(
      "Order notional is below minimum notional: 1",
    );
  });

  it("accepts sufficient notional", () => {
    expect(() =>
      validateOrderNotional(0.01, 100, {
        minNotional: 1,
      }),
    ).not.toThrow();
  });

  it("prepares a normalized limit order", () => {
    expect(
      prepareOrder(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "LIMIT",
          quantity: 0.0019,
          price: 100.126,
        },
        {
          stepSize: 0.001,
          tickSize: 0.01,
          minQty: 0.001,
          minNotional: 0.1,
        },
      ),
    ).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "LIMIT",
      quantity: 0.001,
      price: 100.13,
      clientOrderId: undefined,
    });
  });

  it("prepares a market quote order", () => {
    expect(
      prepareOrder(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quoteOrderQty: 25,
        },
        {
          minNotional: 10,
        },
      ),
    ).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 25,
      clientOrderId: undefined,
    });
  });
});
