import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  Exchange,
} from "../../src/server/exchanges/core/types";

import {
  TradingServices,
} from "../../src/server/trading";

function createExchange(): Exchange {
  return {
    id: "test",
    name: "Test",

    ping:
      vi.fn().mockResolvedValue(true),

    getServerTime:
      vi.fn().mockResolvedValue(1000),

    getSymbol:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        status: "TRADING",
        orderTypes: ["MARKET", "LIMIT"],
        filters: {},
      }),

    getBalances:
      vi.fn().mockResolvedValue([]),

    getBalance:
      vi.fn().mockResolvedValue(undefined),

    getPrice:
      vi.fn().mockResolvedValue(100),

    createOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "FILLED",
        price: 100,
        originalQuantity: 1,
        executedQuantity: 1,
      }),

    getOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "FILLED",
        price: 100,
        originalQuantity: 1,
        executedQuantity: 1,
      }),

    cancelOrder:
      vi.fn(),

    createMarketDataStream: () => ({
      subscribe: async () => {},
      unsubscribe: async () => {},
      onMarketData: () => () => {},
      close: () => {},
    }),
    close:
      vi.fn(),
  };
}

describe("TradingServices startup", () => {
  it("starts through the recovery lifecycle", async () => {
    const services =
      new TradingServices(
        createExchange(),
      );

    const recover =
      vi
        .spyOn(
          services.recovery,
          "recover",
        )
        .mockResolvedValue({
          attempted: 1,
          recovered: 1,
          failed: 0,
          results: [],
        });

    expect(
      services.isStarted(),
    ).toBe(false);

    await services.start();

    expect(recover)
      .toHaveBeenCalledTimes(1);

    expect(
      services.isStarted(),
    ).toBe(true);
  });

  it("does not run recovery twice", async () => {
    const services =
      new TradingServices(
        createExchange(),
      );

    const recover =
      vi
        .spyOn(
          services.recovery,
          "recover",
        )
        .mockResolvedValue({
          attempted: 0,
          recovered: 0,
          failed: 0,
          results: [],
        });

    await services.start();
    await services.start();

    expect(recover)
      .toHaveBeenCalledTimes(1);
  });
});
