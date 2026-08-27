import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ExchangeError,
  isExchangeError,
  normalizeExchangeError,
} from "../../src/server/exchanges/core/ExchangeError";

describe("ExchangeError", () => {
  it("creates a typed exchange error", () => {
    const error = new ExchangeError(
      "INVALID_CREDENTIALS",
      "Invalid API credentials",
      {
        exchange: "binance",
        code: -2015,
        status: 401,
      },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ExchangeError");
    expect(error.code)
      .toBe("INVALID_CREDENTIALS");
    expect(error.exchange)
      .toBe("binance");
    expect(error.exchangeCode)
      .toBe(-2015);
    expect(error.status)
      .toBe(401);
    expect(isExchangeError(error))
      .toBe(true);
  });

  it("normalizes ordinary errors", () => {
    const error =
      normalizeExchangeError(
        new Error("connection failed"),
        "bybit",
      );

    expect(error.code)
      .toBe("UNKNOWN");
    expect(error.exchange)
      .toBe("bybit");
    expect(error.message)
      .toBe("connection failed");
  });

  it("normalizes TypeError as network error", () => {
    const error =
      normalizeExchangeError(
        new TypeError("fetch failed"),
        "mexc",
      );

    expect(error.code)
      .toBe("NETWORK_ERROR");
    expect(error.exchange)
      .toBe("mexc");
  });

  it("preserves an existing ExchangeError", () => {
    const original =
      new ExchangeError(
        "RATE_LIMIT",
        "Too many requests",
      );

    expect(
      normalizeExchangeError(original),
    ).toBe(original);
  });
});
