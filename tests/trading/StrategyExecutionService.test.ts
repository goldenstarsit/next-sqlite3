import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  StrategyExecutionService,
} from "../../src/server/trading";

import {
  OrderService,
} from "../../src/server/trading/services";

import type {
  Exchange,
} from "../../src/server/exchanges/core/types";

function createExchange(): Exchange {
  return {
    id: "test",
    name: "Test Exchange",

    ping: vi.fn().mockResolvedValue(true),

    getServerTime:
      vi.fn().mockResolvedValue(Date.now()),

    getSymbol:
      vi.fn().mockResolvedValue({
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
      }),

    getBalances:
      vi.fn().mockResolvedValue([]),

    getBalance:
      vi.fn(),

    getPrice:
      vi.fn().mockResolvedValue(50000),

    createOrder:
      vi.fn().mockResolvedValue({
        symbol: "BTCUSDT",
        orderId: "1",
        side: "BUY",
        type: "MARKET",
        status: "FILLED",
        price: 50000,
        originalQuantity: 0.01,
        executedQuantity: 0.01,
      }),

    getOrder: vi.fn(),

    cancelOrder: vi.fn(),

    close: vi.fn(),
  };
}

function createService() {
  const exchange = createExchange();

  const orderService =
    new OrderService(exchange);

  const service =
    new StrategyExecutionService(
      orderService,
    );

  return {
    exchange,
    orderService,
    service,
  };
}

describe("StrategyExecutionService", () => {
  it("executes normalized quantity orders", async () => {
    const {
      exchange,
      service,
    } = createService();

    const result =
      await service.execute({
        symbol: "BTCUSDT",
        side: "BUY",
        quantity: 0.123456,
      });

    expect(
      exchange.createOrder,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quantity: 0.12345,
    });

    expect(result.request.quantity)
      .toBe(0.12345);

    expect(result.order.status)
      .toBe("FILLED");
  });

  it("executes legacy quote amount", async () => {
    const {
      exchange,
      service,
    } = createService();

    await service.execute({
      symbol: "BTCUSDT",
      side: "BUY",
      quoteAmount: 10,
    });

    expect(
      exchange.createOrder,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 10,
    });
  });

  it("executes absolute BUY amount", async () => {
    const {
      exchange,
      service,
    } = createService();

    await service.execute({
      symbol: "BTCUSDT",
      side: "BUY",
      amount: {
        value: 25,
        mode: "ABSOLUTE",
      },
    });

    expect(
      exchange.createOrder,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 25,
    });
  });

  it("executes percentage BUY amount", async () => {
    const {
      exchange,
      service,
    } = createService();

    await service.execute(
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

    expect(
      exchange.createOrder,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 25,
    });
  });

  it("executes percentage SELL amount", async () => {
    const {
      exchange,
      service,
    } = createService();

    await service.execute(
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

    expect(
      exchange.createOrder,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      side: "SELL",
      type: "MARKET",
      quantity: 0.005,
    });
  });

  it("rejects missing amount information", async () => {
    const {
      exchange,
      service,
    } = createService();

    await expect(
      service.execute({
        symbol: "BTCUSDT",
        side: "BUY",
      }),
    ).rejects.toThrow(
      "Strategy order requires quantity, quote amount, or amount.",
    );

    expect(
      exchange.createOrder,
    ).not.toHaveBeenCalled();
  });

  it("rejects invalid percentage", async () => {
    const {
      exchange,
      service,
    } = createService();

    await expect(
      service.execute(
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

    expect(
      exchange.createOrder,
    ).not.toHaveBeenCalled();
  });

  it("rejects percentage amount without balances", async () => {
    const {
      exchange,
      service,
    } = createService();

    await expect(
      service.execute({
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

    expect(
      exchange.createOrder,
    ).not.toHaveBeenCalled();
  });

  it("rejects quote amount below exchange minimum", async () => {
    const {
      exchange,
      service,
    } = createService();

    await expect(
      service.execute({
        symbol: "BTCUSDT",
        side: "BUY",
        quoteAmount: 4,
      }),
    ).rejects.toThrow(
      "Strategy order quote amount is below exchange minimum.",
    );

    expect(
      exchange.createOrder,
    ).not.toHaveBeenCalled();
  });
});
