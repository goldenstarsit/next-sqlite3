import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  Exchange,
  ExchangeCredentials,
} from "../../src/server/exchanges/core/types";

import {
  BinanceExchange,
} from "../../src/server/exchanges/binance/BinanceExchange";

import {
  MexcExchange,
} from "../../src/server/exchanges/mexc/MexcExchange";

import {
  BybitExchange,
} from "../../src/server/exchanges/bybit/BybitExchange";

type ExchangeFactory = () => Exchange;

const credentials: ExchangeCredentials = {
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
};

const factories: Array<[
  string,
  ExchangeFactory,
]> = [
  [
    "binance",
    () => new BinanceExchange(),
  ],
  [
    "mexc",
    () => new MexcExchange(),
  ],
  [
    "bybit",
    () => new BybitExchange(),
  ],
];

describe("Exchange Common Contract", () => {
  it.each(factories)(
    "%s exposes the common exchange identity",
    (id, createExchange) => {
      const exchange = createExchange();

      expect(exchange.id).toBe(id);
      expect(exchange.name).toBeTruthy();

      expect(typeof exchange.ping).toBe("function");
      expect(typeof exchange.getServerTime).toBe("function");
      expect(typeof exchange.getSymbol).toBe("function");
      expect(typeof exchange.getBalances).toBe("function");
      expect(typeof exchange.getBalance).toBe("function");
      expect(typeof exchange.getPrice).toBe("function");
      expect(typeof exchange.createOrder).toBe("function");
      expect(typeof exchange.getOrder).toBe("function");
      expect(typeof exchange.cancelOrder).toBe("function");
      expect(typeof exchange.close).toBe("function");
    },
  );

  it.each(factories)(
    "%s requires credentials for private operations",
    async (id, createExchange) => {
      const exchange = createExchange();

      await expect(
        exchange.getBalances(),
      ).rejects.toThrow();

      await expect(
        exchange.createOrder({
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quantity: 0.001,
        }),
      ).rejects.toThrow();

      expect(id).toBeTruthy();
    },
  );

  it("allows all exchanges to be stored behind Exchange", () => {
    const exchanges: Exchange[] =
      factories.map(
        ([, createExchange]) =>
          createExchange(),
      );

    expect(exchanges).toHaveLength(3);

    expect(
      exchanges.map(
        (exchange) => exchange.id,
      ),
    ).toEqual([
      "binance",
      "mexc",
      "bybit",
    ]);
  });
});
