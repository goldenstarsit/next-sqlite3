import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createExchange,
  createExchangeFromConfig,
  isExchangeId,
  SUPPORTED_EXCHANGES,
  type ExchangeId,
} from "../../src/server/exchanges/core/registry";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Exchange Registry", () => {
  it("creates Binance exchange", () => {
    const exchange =
      createExchange("binance");

    expect(exchange.id).toBe("binance");
    expect(exchange.name).toBe("Binance");
  });

  it("creates MEXC exchange", () => {
    const exchange =
      createExchange("mexc");

    expect(exchange.id).toBe("mexc");
    expect(exchange.name).toBe("MEXC");
  });

  it("creates Bybit exchange", () => {
    const exchange =
      createExchange("bybit");

    expect(exchange.id).toBe("bybit");
    expect(exchange.name).toBe("Bybit");
  });

  it("creates all supported exchanges", () => {
    const ids: ExchangeId[] = [
      "binance",
      "mexc",
      "bybit",
    ];

    const exchanges =
      ids.map((id) =>
        createExchange(id),
      );

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

  it("passes credentials to Bybit", async () => {
    const fetchMock =
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
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
                  ],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const exchange =
      createExchange(
        "bybit",
        {
          apiKey: "test-key",
          apiSecret: "test-secret",
        },
      );

    await expect(
      exchange.getBalance("USDT"),
    ).resolves.toEqual({
      asset: "USDT",
      free: 90,
      locked: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, request] =
      fetchMock.mock.calls[0];

    expect(
      request?.headers?.["X-BAPI-API-KEY"],
    ).toBe("test-key");
  });

  it("rejects an unsupported exchange at runtime", () => {
    expect(() =>
      createExchange(
        "unsupported" as ExchangeId,
      ),
    ).toThrow(
      "Unsupported exchange: unsupported",
    );
  });
});


describe("Exchange configuration", () => {
  it("exposes all supported exchanges", () => {
    expect(SUPPORTED_EXCHANGES).toEqual([
      "binance",
      "mexc",
      "bybit",
    ]);
  });

  it("validates exchange ids", () => {
    expect(isExchangeId("binance")).toBe(true);
    expect(isExchangeId("mexc")).toBe(true);
    expect(isExchangeId("bybit")).toBe(true);
    expect(isExchangeId("unknown")).toBe(false);
  });
});


describe("Exchange config factory", () => {
  it("creates an enabled exchange from config", () => {
    const exchange = createExchangeFromConfig({
      id: "bybit",
      enabled: true,
      credentials: {
        apiKey: "key",
        apiSecret: "secret",
      },
    });

    expect(exchange.id).toBe("bybit");
    exchange.close();
  });

  it("rejects a disabled exchange", () => {
    expect(() =>
      createExchangeFromConfig({
        id: "bybit",
        enabled: false,
      }),
    ).toThrow("Exchange is disabled: bybit");
  });

  it("rejects an unsupported exchange", () => {
    expect(() =>
      createExchangeFromConfig({
        id: "kraken" as never,
        enabled: true,
      }),
    ).toThrow("Unsupported exchange: kraken");
  });
});

describe("Default exchange configuration", () => {
  it("provides disabled defaults for every supported exchange", async () => {
    const {
      DEFAULT_EXCHANGE_CONFIGS,
      getDefaultExchangeConfig,
    } = await import(
      "../../src/server/exchanges/core/config"
    );

    expect(DEFAULT_EXCHANGE_CONFIGS).toHaveLength(3);
    expect(
      DEFAULT_EXCHANGE_CONFIGS.every(
        (config) => config.enabled === false,
      ),
    ).toBe(true);

    expect(
      getDefaultExchangeConfig("binance"),
    ).toEqual({
      id: "binance",
      enabled: false,
    });
  });
});
