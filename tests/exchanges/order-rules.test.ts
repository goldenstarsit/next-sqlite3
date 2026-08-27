import { describe, expect, it } from "vitest";

import {
  validateOrderRequest,
} from "../../src/server/exchanges/core/OrderRules";

describe("Order Request Rules", () => {
  it("accepts a market order using quantity", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
      }),
    ).not.toThrow();
  });

  it("accepts a market order using quoteOrderQty", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quoteOrderQty: 25,
      }),
    ).not.toThrow();
  });

  it("accepts a limit order with quantity and price", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "LIMIT",
        quantity: 0.001,
        price: 100000,
      }),
    ).not.toThrow();
  });

  it("rejects quantity and quoteOrderQty together", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        quoteOrderQty: 25,
      }),
    ).toThrow(
      "quantity and quoteOrderQty cannot be used together.",
    );
  });

  it("rejects an order without quantity or quote amount", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
      }),
    ).toThrow(
      "Either quantity or quoteOrderQty is required.",
    );
  });

  it("rejects zero quantity", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0,
      }),
    ).toThrow(
      "Order quantity must be greater than zero.",
    );
  });

  it("rejects negative quote amount", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quoteOrderQty: -10,
      }),
    ).toThrow(
      "Order quote amount must be greater than zero.",
    );
  });

  it("rejects limit order without price", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "LIMIT",
        quantity: 0.001,
      }),
    ).toThrow(
      "Limit orders require a price greater than zero.",
    );
  });

  it("rejects limit order using quoteOrderQty", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "LIMIT",
        quoteOrderQty: 25,
        price: 100000,
      }),
    ).toThrow(
      "Limit orders require quantity, not quoteOrderQty.",
    );
  });

  it("rejects market order with price", () => {
    expect(() =>
      validateOrderRequest({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        price: 100000,
      }),
    ).toThrow(
      "Market orders must not specify a price.",
    );
  });
});
