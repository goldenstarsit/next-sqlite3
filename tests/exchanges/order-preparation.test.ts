import { describe, expect, it } from "vitest";

import {
  normalizeOrderQuantity,
  normalizeOrderPrice,
  validateOrderNotional,
  prepareOrder,
  calculateMinimumQuantity,
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

describe("Market-specific exchange rules", () => {
  it("uses MARKET_LOT_SIZE instead of LOT_SIZE", () => {
    expect(
      prepareOrder(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quantity: 1.237,
        },
        {
          minQty: 0.001,
          maxQty: 10,
          stepSize: 0.001,
          marketMinQty: 0.01,
          marketMaxQty: 5,
          marketStepSize: 0.01,
        },
      ),
    ).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quantity: 1.23,
      clientOrderId: undefined,
    });
  });

  it("rejects market quote amount below minimum notional", () => {
    expect(() =>
      prepareOrder(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quoteOrderQty: 5,
        },
        {
          minNotional: 10,
          applyMinNotionalToMarket: true,
        },
      ),
    ).toThrow(
      "Order quote amount is below minimum notional: 10",
    );
  });

  it("allows market quote amount when min notional does not apply", () => {
    expect(() =>
      prepareOrder(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quoteOrderQty: 5,
        },
        {
          minNotional: 10,
          applyMinNotionalToMarket: false,
        },
      ),
    ).not.toThrow();
  });

  it("rejects market quote amount above maximum notional", () => {
    expect(() =>
      prepareOrder(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quoteOrderQty: 101,
        },
        {
          maxNotional: 100,
          applyMaxNotionalToMarket: true,
        },
      ),
    ).toThrow(
      "Order quote amount exceeds maximum notional: 100",
    );
  });

  it("rounds minimum quantity upward to the next valid step", () => {
    expect(
      calculateMinimumQuantity(
        3,
        {
          symbol: "TESTUSDT",
          filters: {
            minQty: 0.01,
            stepSize: 0.01,
            minNotional: 0.1,
          },
        },
      ),
    ).toBe(0.04);
  });
});
