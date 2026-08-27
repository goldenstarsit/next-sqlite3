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
  createTradingServices,
  createTradingServicesForExchange,
} from "../../src/server/trading";

function createMockExchange(): Exchange {
  return {
    id: "test",
    name: "Test Exchange",

    ping: vi.fn().mockResolvedValue(true),

    getServerTime:
      vi.fn().mockResolvedValue(1720000000000),

    getSymbol:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        status: "Trading",
        orderTypes: [
          "MARKET",
          "LIMIT",
        ],
        filters: {},
      }),

    getBalances:
      vi.fn().mockResolvedValue([]),

    getBalance:
      vi.fn().mockResolvedValue(undefined),

    getPrice:
      vi.fn().mockResolvedValue(65000),

    createOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "FILLED",
        price: 65000,
        originalQuantity: 0.001,
        executedQuantity: 0.001,
      }),

    getOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "FILLED",
        price: 65000,
        originalQuantity: 0.001,
        executedQuantity: 0.001,
        transactTime: 1720000000000,
      }),

    cancelOrder:
      vi.fn(),

    createMarketDataStream: () => ({
      subscribe: async () => {},
      unsubscribe: async () => {},
      onMarketData: () => () => {},
      close: () => {},
    }),
    close: vi.fn(),
  };
}

describe("TradingServices", () => {
  it("creates all services from one exchange", () => {
    const exchange =
      createMockExchange();

    const services =
      new TradingServices(exchange);

    expect(services.marketData)
      .toBeDefined();

    expect(services.balance)
      .toBeDefined();

    expect(services.order)
      .toBeDefined();

    expect(services.strategyExecution)
      .toBeDefined();
  });

  it("uses the shared exchange", async () => {
    const exchange =
      createMockExchange();

    const services =
      createTradingServices(exchange);

    await expect(
      services.marketData.getPrice(
        "BTCUSDT",
      ),
    ).resolves.toBe(65000);

    await expect(
      services.balance.getBalances(),
    ).resolves.toEqual([]);

    expect(exchange.getPrice)
      .toHaveBeenCalledWith(
        "BTCUSDT",
      );
  });

  it("connects strategy execution to OrderService", async () => {
    const exchange =
      createMockExchange();

    const services =
      createTradingServices(exchange);

    const result =
      await services.strategyExecution.execute({
        symbol: "BTCUSDT",
        side: "BUY",
        quantity: 0.001,
      });

    expect(result.order.orderId)
      .toBe("order-1");

    expect(exchange.createOrder)
      .toHaveBeenCalledWith({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
      });
  });

  it("creates services from an exchange id", () => {
    const services =
      createTradingServicesForExchange(
        "bybit",
      );

    expect(services)
      .toBeInstanceOf(
        TradingServices,
      );

    expect(services.marketData)
      .toBeDefined();

    expect(services.balance)
      .toBeDefined();

    expect(services.order)
      .toBeDefined();

    expect(services.strategyExecution)
      .toBeDefined();
  });
});
