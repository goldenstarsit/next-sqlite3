import {
  describe,
  expect,
  it,
} from "vitest";

import {
  StrategyOrderResolver,
} from "../../src/server/trading";

import type {
  Exchange,
  ExchangeSymbol,
} from "../../src/server/exchanges/core/types";

function createSymbol(): ExchangeSymbol {
  return {
    symbol: "BTCUSDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    status: "TRADING",
    orderTypes: ["MARKET"],
    filters: {
      minQty: 0.00001,
      maxQty: 1000,
      stepSize: 0.00001,
      minNotional: 5,
    },
  };
}

function createExchange(): Exchange {
  return {
    id: "test",
    name: "Test Exchange",

    ping: async () => true,

    getServerTime: async () =>
      Date.now(),

    getSymbol: async () =>
      createSymbol(),

    getBalances: async () => [],

    getBalance: async () =>
      undefined,

    getPrice: async () =>
      50000,

    createOrder: async () => {
      throw new Error(
        "createOrder must not be called",
      );
    },

    getOrder: async () => {
      throw new Error("not implemented");
    },

    cancelOrder: async () => {
      throw new Error("not implemented");
    },

    createMarketDataStream: () => ({
      subscribe: async () => {},
      unsubscribe: async () => {},
      onMarketData: () => () => {},
      close: () => {},
    }),
    close: () => {},
  };
}

describe("StrategyOrderResolver", () => {
  it("resolves an explicit quantity", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    const result =
      await resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        quantity: 0.123456,
      });

    expect(result.request).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quantity: 0.12345,
    });
  });

  it("resolves legacy quote amount", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    const result =
      await resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        quoteAmount: 100,
      });

    expect(result.request).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 100,
    });
  });

  it("resolves absolute amount for BUY", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    const result =
      await resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        amount: {
          value: 25,
          mode: "ABSOLUTE",
        },
      });

    expect(result.request).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 25,
    });
  });

  it("resolves percentage amount for BUY from quote balance", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    const result =
      await resolver.resolve(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          amount: {
            value: 25,
            mode: "PERCENTAGE",
          },
        },
        {
          quoteFree: 100,
          baseFree: 0.01,
        },
      );

    expect(result.request).toEqual({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 25,
    });
  });

  it("resolves percentage amount for SELL from base balance", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    const result =
      await resolver.resolve(
        {
          symbol: "BTCUSDT",
          side: "SELL",
          amount: {
            value: 50,
            mode: "PERCENTAGE",
          },
        },
        {
          quoteFree: 100,
          baseFree: 0.01,
        },
      );

    expect(result.request).toEqual({
      symbol: "BTCUSDT",
      side: "SELL",
      type: "MARKET",
      quantity: 0.005,
    });
  });

  it("rejects missing amount information", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    await expect(
      resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
      }),
    ).rejects.toThrow(
      "Strategy order requires quantity, quote amount, or amount.",
    );
  });

  it("rejects both quantity and quote amount", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    await expect(
      resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        quantity: 0.01,
        quoteAmount: 100,
      }),
    ).rejects.toThrow(
      "Strategy order cannot contain multiple amount specifications.",
    );
  });

  it("rejects invalid percentage", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    await expect(
      resolver.resolve(
        {
          symbol: "BTCUSDT",
          side: "BUY",
          amount: {
            value: 101,
            mode: "PERCENTAGE",
          },
        },
        {
          quoteFree: 100,
          baseFree: 0,
        },
      ),
    ).rejects.toThrow(
      "Strategy order percentage must be greater than 0 and at most 100.",
    );
  });

  it("rejects percentage amount without balances", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    await expect(
      resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        amount: {
          value: 25,
          mode: "PERCENTAGE",
        },
      }),
    ).rejects.toThrow(
      "Strategy order balances are required for percentage amounts.",
    );
  });

  it("rejects quantity below exchange minimum", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    await expect(
      resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        quantity: 0.000001,
      }),
    ).rejects.toThrow(
      "Strategy order quantity is below exchange minimum.",
    );
  });

  it("rejects quote amount below minimum notional", async () => {
    const resolver =
      new StrategyOrderResolver(
        createExchange(),
      );

    await expect(
      resolver.resolve({
        symbol: "BTCUSDT",
        side: "BUY",
        quoteAmount: 4,
      }),
    ).rejects.toThrow(
      "Strategy order quote amount is below exchange minimum.",
    );
  });
});
