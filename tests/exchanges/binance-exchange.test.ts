import crypto from "node:crypto";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  BinanceExchange,
} from "../../src/server/exchanges/binance/BinanceExchange";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

describe("BinanceExchange", () => {
  describe("public API", () => {
    it("pings Binance", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 200,
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange();

      await expect(
        exchange.ping(),
      ).resolves.toBe(true);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        "https://api.binance.com/api/v3/ping",
      );
    });

    it("gets Binance server time", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            serverTime: 1234567890,
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange();

      await expect(
        exchange.getServerTime(),
      ).resolves.toBe(1234567890);
    });

    it("gets symbol information and parses filters", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            symbols: [
              {
                symbol: "BTCUSDT",
                status: "TRADING",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                baseAssetPrecision: 8,
                quoteAssetPrecision: 8,
                orderTypes: [
                  "LIMIT",
                  "MARKET",
                ],
                filters: [
                  {
                    filterType: "PRICE_FILTER",
                    minPrice: "0.01000000",
                    maxPrice: "1000000.00000000",
                    tickSize: "0.01000000",
                  },
                  {
                    filterType: "LOT_SIZE",
                    minQty: "0.00001000",
                    maxQty: "1000.00000000",
                    stepSize: "0.00001000",
                  },
                  {
                    filterType: "MIN_NOTIONAL",
                    minNotional: "5.00000000",
                  },
                ],
              },
            ],
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange();

      await expect(
        exchange.getSymbol("btcusdt"),
      ).resolves.toEqual({
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        status: "TRADING",
        baseAssetPrecision: 8,
        quoteAssetPrecision: 8,
        orderTypes: [
          "LIMIT",
          "MARKET",
        ],
        filters: {
          minQty: 0.00001,
          maxQty: 1000,
          stepSize: 0.00001,
          minNotional: 5,
          tickSize: 0.01,
          minPrice: 0.01,
          maxPrice: 1000000,
        },
      });

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        "https://api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT",
      );
    });

    it("gets price", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            symbol: "BTCUSDT",
            price: "65000.25",
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange();

      await expect(
        exchange.getPrice("btcusdt"),
      ).resolves.toBe(65000.25);

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      );
    });
  });

  describe("credentials", () => {
    it("rejects private operations without credentials", async () => {
      const exchange =
        new BinanceExchange();

      await expect(
        exchange.getBalances(),
      ).rejects.toThrow(
        "Binance credentials are required for this operation.",
      );

      await expect(
        exchange.createOrder({
          symbol: "BTCUSDT",
          side: "BUY",
          type: "MARKET",
          quantity: 0.001,
        }),
      ).rejects.toThrow(
        "Binance credentials are required for this operation.",
      );
    });
  });

  describe("signed account requests", () => {
    it("gets balances and sends API credentials", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            balances: [
              {
                asset: "USDT",
                free: "90.50",
                locked: "10.25",
              },
              {
                asset: "BTC",
                free: "0.001",
                locked: "0.002",
              },
            ],
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "test-api-key",
          apiSecret: "test-api-secret",
        });

      await expect(
        exchange.getBalances(),
      ).resolves.toEqual([
        {
          asset: "USDT",
          free: 90.5,
          locked: 10.25,
        },
        {
          asset: "BTC",
          free: 0.001,
          locked: 0.002,
        },
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [
        url,
        request,
      ] = fetchMock.mock.calls[0];

      expect(url).toContain(
        "https://api.binance.com/api/v3/account?",
      );

      expect(request.method).toBe("GET");

      expect(
        request.headers["X-MBX-APIKEY"],
      ).toBe("test-api-key");

      const parsed =
        new URL(url);

      expect(
        parsed.searchParams.get("recvWindow"),
      ).toBe("5000");

      expect(
        parsed.searchParams.get("timestamp"),
      ).toBeTruthy();

      expect(
        parsed.searchParams.get("signature"),
      ).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces a valid HMAC signature", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            balances: [],
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "test-api-key",
          apiSecret: "test-api-secret",
        });

      await exchange.getBalances();

      const [url] =
        fetchMock.mock.calls[0];

      const parsed =
        new URL(url);

      const signature =
        parsed.searchParams.get(
          "signature",
        );

      parsed.searchParams.delete(
        "signature",
      );

      const expected =
        crypto
          .createHmac(
            "sha256",
            "test-api-secret",
          )
          .update(
            parsed.searchParams.toString(),
          )
          .digest("hex");

      expect(signature).toBe(expected);
    });

    it("gets a single balance case-insensitively", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            balances: [
              {
                asset: "USDT",
                free: "100",
                locked: "5",
              },
            ],
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "key",
          apiSecret: "secret",
        });

      await expect(
        exchange.getBalance("usdt"),
      ).resolves.toEqual({
        asset: "USDT",
        free: 100,
        locked: 5,
      });
    });
  });

  describe("orders", () => {
    it("creates a market order with quantity", async () => {
      const fetchMock =
        vi.fn()
          .mockResolvedValueOnce(
            jsonResponse({
              symbols: [
                {
                  symbol: "BTCUSDT",
                  status: "TRADING",
                  baseAsset: "BTC",
                  quoteAsset: "USDT",
                  baseAssetPrecision: 8,
                  quoteAssetPrecision: 8,
                  orderTypes: [
                    "LIMIT",
                    "MARKET",
                  ],
                  filters: [
                    {
                      filterType: "PRICE_FILTER",
                      minPrice: "0.01000000",
                      maxPrice: "1000000.00000000",
                      tickSize: "0.01000000",
                    },
                    {
                      filterType: "LOT_SIZE",
                      minQty: "0.00001000",
                      maxQty: "1000.00000000",
                      stepSize: "0.00001000",
                    },
                    {
                      filterType: "MIN_NOTIONAL",
                      minNotional: "5.00000000",
                    },
                  ],
                },
              ],
            }),
          )
          .mockResolvedValueOnce(

          jsonResponse({
            symbol: "BTCUSDT",
            orderId: 12345,
            clientOrderId: "client-1",
            side: "BUY",
            type: "MARKET",
            status: "FILLED",
            price: "65000.00",
            origQty: "0.001",
            executedQty: "0.001",
            transactTime: 1234567890,
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "key",
          apiSecret: "secret",
        });

      await expect(
        exchange.createOrder({
          symbol: "btcusdt",
          side: "BUY",
          type: "MARKET",
          quantity: 0.001,
          clientOrderId: "client-1",
        }),
      ).resolves.toEqual({
        symbol: "BTCUSDT",
        orderId: "12345",
        clientOrderId: "client-1",
        side: "BUY",
        type: "MARKET",
        status: "FILLED",
        price: 65000,
        originalQuantity: 0.001,
        executedQuantity: 0.001,
        transactTime: 1234567890,
      });

      const [url, request] =
        fetchMock.mock.calls[1];

      expect(
        url,
      ).toContain(
        "https://api.binance.com/api/v3/order?",
      );

      expect(request.method).toBe("POST");

      const parsed =
        new URL(url);

      expect(
        parsed.searchParams.get("symbol"),
      ).toBe("BTCUSDT");

      expect(
        parsed.searchParams.get("side"),
      ).toBe("BUY");

      expect(
        parsed.searchParams.get("type"),
      ).toBe("MARKET");

      expect(
        parsed.searchParams.get("quantity"),
      ).toBe("0.001");

      expect(
        parsed.searchParams.get(
          "newClientOrderId",
        ),
      ).toBe("client-1");
    });

    it("creates an order using quoteOrderQty", async () => {
      const fetchMock =
        vi.fn()
          .mockResolvedValueOnce(
            jsonResponse({
              symbols: [
                {
                  symbol: "BTCUSDT",
                  status: "TRADING",
                  baseAsset: "BTC",
                  quoteAsset: "USDT",
                  baseAssetPrecision: 8,
                  quoteAssetPrecision: 8,
                  orderTypes: [
                    "LIMIT",
                    "MARKET",
                  ],
                  filters: [
                    {
                      filterType: "PRICE_FILTER",
                      minPrice: "0.01000000",
                      maxPrice: "1000000.00000000",
                      tickSize: "0.01000000",
                    },
                    {
                      filterType: "LOT_SIZE",
                      minQty: "0.00001000",
                      maxQty: "1000.00000000",
                      stepSize: "0.00001000",
                    },
                    {
                      filterType: "MIN_NOTIONAL",
                      minNotional: "5.00000000",
                    },
                  ],
                },
              ],
            }),
          )
          .mockResolvedValueOnce(

          jsonResponse({
            symbol: "BTCUSDT",
            orderId: 123,
            side: "BUY",
            type: "MARKET",
            status: "NEW",
            price: "0",
            origQty: "0",
            executedQty: "0",
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "key",
          apiSecret: "secret",
        });

      await exchange.createOrder({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quoteOrderQty: 25,
      });

      const [url] =
        fetchMock.mock.calls[1];

      const parsed =
        new URL(url);

      expect(
        parsed.searchParams.get(
          "quoteOrderQty",
        ),
      ).toBe("25");

      expect(
        parsed.searchParams.get(
          "quantity",
        ),
      ).toBeNull();
    });

    it("gets an order", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            symbol: "ETHUSDT",
            orderId: 99,
            origClientOrderId: "client-99",
            side: "SELL",
            type: "LIMIT",
            status: "NEW",
            price: "3000",
            origQty: "0.01",
            executedQty: "0",
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "key",
          apiSecret: "secret",
        });

      await expect(
        exchange.getOrder(
          "ethusdt",
          "99",
        ),
      ).resolves.toEqual({
        symbol: "ETHUSDT",
        orderId: "99",
        clientOrderId: "client-99",
        side: "SELL",
        type: "LIMIT",
        status: "NEW",
        price: 3000,
        originalQuantity: 0.01,
        executedQuantity: 0,
      });
    });

    it("cancels an order", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            symbol: "ETHUSDT",
            orderId: 99,
            side: "SELL",
            type: "LIMIT",
            status: "CANCELED",
            price: "3000",
            origQty: "0.01",
            executedQty: "0",
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange({
          apiKey: "key",
          apiSecret: "secret",
        });

      await expect(
        exchange.cancelOrder(
          "ETHUSDT",
          "99",
        ),
      ).resolves.toMatchObject({
        symbol: "ETHUSDT",
        orderId: "99",
        status: "CANCELED",
      });

      const [
        url,
        request,
      ] = fetchMock.mock.calls[0];

      expect(request.method).toBe(
        "DELETE",
      );

      expect(url).toContain(
        "symbol=ETHUSDT",
      );

      expect(url).toContain(
        "orderId=99",
      );
    });
  });

  describe("errors", () => {
    it("includes Binance API error code and message", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              code: -1121,
              msg: "Invalid symbol.",
            },
            400,
          ),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange();

      await expect(
        exchange.getPrice("INVALID"),
      ).rejects.toThrow(
        "Binance API error: HTTP 400 - Invalid symbol. (-1121)",
      );
    });

    it("throws when symbol is not returned", async () => {
      const fetchMock =
        vi.fn().mockResolvedValue(
          jsonResponse({
            symbols: [],
          }),
        );

      vi.stubGlobal("fetch", fetchMock);

      const exchange =
        new BinanceExchange();

      await expect(
        exchange.getSymbol("INVALID"),
      ).rejects.toThrow(
        "Binance symbol not found: INVALID",
      );
    });
  });
});
