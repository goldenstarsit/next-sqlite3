import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createBinanceError,
} from "../../src/server/exchanges/binance/BinanceError";

describe("BinanceError", () => {
  it("maps invalid credentials", () => {
    expect(
      createBinanceError(
        "Invalid API-key",
        -2015,
        401,
      ).code,
    ).toBe("INVALID_CREDENTIALS");
  });

  it("maps insufficient balance", () => {
    expect(
      createBinanceError(
        "Insufficient balance",
        -2010,
      ).code,
    ).toBe("INSUFFICIENT_BALANCE");
  });

  it("maps invalid symbol", () => {
    expect(
      createBinanceError(
        "Unknown symbol",
        -1121,
      ).code,
    ).toBe("INVALID_SYMBOL");
  });

  it("maps order not found", () => {
    expect(
      createBinanceError(
        "Order does not exist",
        -2013,
      ).code,
    ).toBe("ORDER_NOT_FOUND");
  });

  it("preserves exchange identity", () => {
    const error =
      createBinanceError(
        "test",
        -2015,
      );

    expect(error.exchange)
      .toBe("binance");

    expect(error.exchangeCode)
      .toBe(-2015);
  });
});
