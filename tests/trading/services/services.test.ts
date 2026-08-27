import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  Exchange,
} from "../../../src/server/exchanges/core/types";

import {
  BalanceService,
  MarketDataService,
  OrderService,
} from "../../../src/server/trading/services";

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
        filters: {
          minQty: 0.00001,
          stepSize: 0.000001,
          minNotional: 1,
          tickSize: 0.01,
        },
      }),

    getPrice:
      vi.fn().mockResolvedValue(65000),

    getBalance:
      vi.fn().mockResolvedValue({
        asset: "USDT",
        free: 100,
        locked: 10,
      }),

    getBalances:
      vi.fn().mockResolvedValue([
        {
          asset: "USDT",
          free: 100,
          locked: 10,
        },
      ]),

    createOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "NEW",
        price: 0,
        originalQuantity: 0.001,
        executedQuantity: 0,
      }),

    getOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "Filled",
        price: 65000,
        originalQuantity: 0.001,
        executedQuantity: 0.001,
      }),

    cancelOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "CANCELED",
        price: 0,
        originalQuantity: 0.001,
        executedQuantity: 0,
      }),

    createMarketDataStream: () => ({
      subscribe: async () => {},
      unsubscribe: async () => {},
      onMarketData: () => () => {},
      close: () => {},
    }),
    close: vi.fn(),
  };
}

describe("Trading Services", () => {
  it("uses exchange through MarketDataService", async () => {
    const exchange = createMockExchange();

    const service =
      new MarketDataService(exchange);

    await expect(
      service.getPrice("BTCUSDT"),
    ).resolves.toBe(65000);

    await expect(
      service.getServerTime(),
    ).resolves.toBe(1720000000000);

    await expect(
      service.ping(),
    ).resolves.toBe(true);

    expect(exchange.getPrice)
      .toHaveBeenCalledWith("BTCUSDT");
  });

  it("uses exchange through BalanceService", async () => {
    const exchange = createMockExchange();

    const service =
      new BalanceService(exchange);

    await expect(
      service.getBalance("USDT"),
    ).resolves.toEqual({
      asset: "USDT",
      free: 100,
      locked: 10,
    });

    await expect(
      service.getBalances(),
    ).resolves.toHaveLength(1);
  });

  it("uses exchange through OrderService", async () => {
    const exchange = createMockExchange();

    const service =
      new OrderService(exchange);

    const order =
      await service.createOrder({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
      });

    expect(order.orderId).toBe("order-1");

    await service.getOrder(
      "BTCUSDT",
      "order-1",
    );

    await service.cancelOrder(
      "BTCUSDT",
      "order-1",
    );

    expect(exchange.createOrder)
      .toHaveBeenCalledTimes(1);

    expect(exchange.getOrder)
      .toHaveBeenCalledWith(
        "BTCUSDT",
        "order-1",
      );

    expect(exchange.cancelOrder)
      .toHaveBeenCalledWith(
        "BTCUSDT",
        "order-1",
      );
  });
});
