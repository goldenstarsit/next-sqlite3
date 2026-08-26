import {
  describe,
  expect,
  it,
} from "vitest";

import {
  GridStrategy,
} from "../../src/server/strategies/grid";

describe("Grid Strategy", () => {
  it("creates grid levels", () => {
    const strategy =
      new GridStrategy({
        enabled: true,
        lowerPrice: 90,
        upperPrice: 110,
        gridCount: 5,
        orderAmountPercentage: 100,
        minimumOrderMode:
          "exchange-minimum",
      });

    const orders =
      strategy.calculateOrders({
        symbol: "BTCUSDT",
        currentPrice: 100,
      });

    expect(orders).toHaveLength(5);

    expect(orders[0].price).toBe(90);
    expect(orders[2].price).toBe(100);
    expect(orders[4].price).toBe(110);

    expect(orders[0].side).toBe("BUY");
    expect(orders[4].side).toBe("SELL");
  });

  it("rejects invalid range", () => {
    expect(
      () =>
        new GridStrategy({
          enabled: true,
          lowerPrice: 100,
          upperPrice: 90,
          gridCount: 5,
          orderAmountPercentage: 100,
          minimumOrderMode:
            "exchange-minimum",
        }),
    ).toThrow();
  });
});
