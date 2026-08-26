import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  BybitExchange,
} from "../../src/server/exchanges/bybit";

import type {
  ExchangeCredentials,
} from "../../src/server/exchanges/core/types";

const credentials: ExchangeCredentials = {
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockFetch(
  body: unknown,
  status = 200,
) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify(body),
      {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );
}

describe("BybitExchange", () => {
  it("has the correct exchange identity", () => {
    const exchange =
      new BybitExchange();

    expect(exchange.id).toBe("bybit");
    expect(exchange.name).toBe("Bybit");
  });

  it("pings the Bybit API", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {},
    });

    const exchange =
      new BybitExchange();

    await expect(
      exchange.ping(),
    ).resolves.toBe(true);

    expect(
      globalThis.fetch,
    ).toHaveBeenCalledWith(
      "https://api.bybit.com/v5/market/time",
      {
        method: "GET",
        cache: "no-store",
      },
    );
  });

  it("gets server time from timeNano", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        timeSecond: "1720000000",
        timeNano: "1720000000123456789",
      },
    });

    const exchange =
      new BybitExchange();

    const result =
      await exchange.getServerTime();

    expect(result).toBe(
      1720000000123,
    );
  });

  it("gets a spot symbol and its filters", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        category: "spot",
        list: [
          {
            symbol: "BTCUSDT",
            status: "Trading",
            baseCoin: "BTC",
            quoteCoin: "USDT",
            basePrecision: "0.000001",
            quotePrecision: "0.00000001",
            priceFilter: {
              tickSize: "0.01",
              minPrice: "0.01",
              maxPrice: "9999999",
            },
            lotSizeFilter: {
              basePrecision: "0.000001",
              quotePrecision: "0.00000001",
              minOrderQty: "0.00001",
              maxOrderQty: "71.73",
              minOrderAmt: "1",
              maxOrderAmt: "1000000",
            },
          },
        ],
      },
    });

    const exchange =
      new BybitExchange();

    const symbol =
      await exchange.getSymbol(
        "BTCUSDT",
      );

    expect(symbol.symbol).toBe(
      "BTCUSDT",
    );

    expect(symbol.baseAsset).toBe(
      "BTC",
    );

    expect(symbol.quoteAsset).toBe(
      "USDT",
    );

    expect(symbol.status).toBe(
      "Trading",
    );

    expect(
      symbol.filters.minQty,
    ).toBe(0.00001);

    expect(
      symbol.filters.maxQty,
    ).toBe(71.73);

    expect(
      symbol.filters.minNotional,
    ).toBe(1);

    expect(
      symbol.filters.tickSize,
    ).toBe(0.01);

    expect(
      symbol.filters.stepSize,
    ).toBe(0.000001);
  });

  it("gets the current spot price", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        category: "spot",
        list: [
          {
            symbol: "BTCUSDT",
            lastPrice: "65000.25",
          },
        ],
      },
    });

    const exchange =
      new BybitExchange();

    await expect(
      exchange.getPrice(
        "BTCUSDT",
      ),
    ).resolves.toBe(65000.25);
  });

  it("gets a single balance", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        list: [
          {
            coin: [
              {
                coin: "USDT",
                walletBalance: "100.50",
                free: "95.25",
                locked: "5.25",
              },
            ],
          },
        ],
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    const balance =
      await exchange.getBalance(
        "USDT",
      );

    expect(balance).toEqual({
      asset: "USDT",
      free: 95.25,
      locked: 5.25,
    });
  });

  it("gets all balances", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        list: [
          {
            coin: [
              {
                coin: "USDT",
                walletBalance: "100",
                free: "90",
                locked: "10",
              },
              {
                coin: "BTC",
                walletBalance: "0.01",
                free: "0.008",
                locked: "0.002",
              },
            ],
          },
        ],
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    const balances =
      await exchange.getBalances();

    expect(balances).toEqual([
      {
        asset: "USDT",
        free: 90,
        locked: 10,
      },
      {
        asset: "BTC",
        free: 0.008,
        locked: 0.002,
      },
    ]);
  });

  it("creates a market order using quantity", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        orderId: "bybit-order-1",
        orderLinkId: "client-1",
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    const result =
      await exchange.createOrder({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
      });

    expect(
      result.orderId,
    ).toBe("bybit-order-1");

    expect(result.status).toBe(
      "NEW",
    );

    const fetchMock =
      vi.mocked(globalThis.fetch);

    const [, request] =
      fetchMock.mock.calls[0];

    expect(request?.method).toBe(
      "POST",
    );

    const body =
      JSON.parse(
        String(request?.body),
      );

    expect(body).toEqual({
      category: "spot",
      symbol: "BTCUSDT",
      side: "Buy",
      orderType: "Market",
      qty: 0.001,
      timeInForce: "IOC",
    });
  });

  it("creates a market buy order using quote amount", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        orderId: "bybit-order-2",
        orderLinkId: "client-2",
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    await exchange.createOrder({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: 10,
    });

    const fetchMock =
      vi.mocked(globalThis.fetch);

    const [, request] =
      fetchMock.mock.calls[0];

    const body =
      JSON.parse(
        String(request?.body),
      );

    expect(body).toEqual({
      category: "spot",
      symbol: "BTCUSDT",
      side: "Buy",
      orderType: "Market",
      qty: 10,
      marketUnit: "quoteCoin",
      timeInForce: "IOC",
    });
  });

  it("creates a limit order", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        orderId: "bybit-order-3",
        orderLinkId: "client-3",
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    const result =
      await exchange.createOrder({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: 0.002,
        price: 70000,
        clientOrderId: "client-3",
      });

    expect(result.type).toBe(
      "LIMIT",
    );

    const fetchMock =
      vi.mocked(globalThis.fetch);

    const [, request] =
      fetchMock.mock.calls[0];

    const body =
      JSON.parse(
        String(request?.body),
      );

    expect(body).toEqual({
      category: "spot",
      symbol: "BTCUSDT",
      side: "Sell",
      orderType: "Limit",
      qty: 0.002,
      price: 70000,
      timeInForce: "GTC",
      orderLinkId: "client-3",
    });
  });

  it("gets an order and normalizes its status", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        list: [
          {
            orderId: "bybit-order-4",
            orderLinkId: "client-4",
            symbol: "BTCUSDT",
            orderStatus: "Filled",
            price: "65000",
            qty: "0.001",
            cumExecQty: "0.001",
            side: "Buy",
            orderType: "Market",
            updatedTime: "1720000000123",
          },
        ],
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    const order =
      await exchange.getOrder(
        "BTCUSDT",
        "bybit-order-4",
      );

    expect(order).toEqual({
      symbol: "BTCUSDT",
      orderId: "bybit-order-4",
      clientOrderId: "client-4",
      side: "BUY",
      type: "MARKET",
      status: "FILLED",
      price: 65000,
      originalQuantity: 0.001,
      executedQuantity: 0.001,
      transactTime: 1720000000123,
    });
  });

  it("cancels an order", async () => {
    mockFetch({
      retCode: 0,
      retMsg: "OK",
      result: {
        orderId: "bybit-order-5",
        orderLinkId: "client-5",
      },
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    const result =
      await exchange.cancelOrder(
        "BTCUSDT",
        "bybit-order-5",
      );

    expect(result.orderId).toBe(
      "bybit-order-5",
    );

    expect(result.status).toBe(
      "CANCELED",
    );
  });

  it("rejects authenticated requests without credentials", async () => {
    const exchange =
      new BybitExchange();

    await expect(
      exchange.getBalance("USDT"),
    ).rejects.toThrow(
      "Bybit credentials are required for this operation.",
    );
  });

  it("handles Bybit API errors", async () => {
    mockFetch({
      retCode: 10001,
      retMsg: "Invalid request",
    });

    const exchange =
      new BybitExchange(
        credentials,
      );

    await expect(
      exchange.getBalance("USDT"),
    ).rejects.toThrow(
      "Bybit API error: Invalid request (10001)",
    );
  });
});
