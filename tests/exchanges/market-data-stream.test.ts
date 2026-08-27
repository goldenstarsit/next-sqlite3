import { describe, expect, it, vi } from "vitest";

import type {
  MarketDataEvent,
  MarketDataStream,
} from "../../src/server/exchanges/core/market-data";

function createMockStream(): MarketDataStream {
  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onMarketData: vi.fn(() => () => {}),
    close: vi.fn(),
  };
}

describe("Market Data Stream contract", () => {
  it("exposes subscribe, unsubscribe, and close", () => {
    const stream = createMockStream();

    expect(typeof stream.subscribe).toBe("function");
    expect(typeof stream.unsubscribe).toBe("function");
    expect(typeof stream.close).toBe("function");
  });

  it("defines an exchange-independent market data event", () => {
    const event: MarketDataEvent = {
      exchange: "binance",
      symbol: "BTCUSDT",
      price: 100000,
      timestamp: 1756200000000,
    };

    expect(event).toEqual({
      exchange: "binance",
      symbol: "BTCUSDT",
      price: 100000,
      timestamp: 1756200000000,
    });
  });

  it("supports subscribing to multiple symbols", async () => {
    const stream = createMockStream();

    await stream.subscribe(["BTCUSDT", "ETHUSDT"]);

    expect(stream.subscribe).toHaveBeenCalledWith([
      "BTCUSDT",
      "ETHUSDT",
    ]);
  });

  it("supports unsubscribing from symbols", async () => {
    const stream = createMockStream();

    await stream.unsubscribe(["BTCUSDT"]);

    expect(stream.unsubscribe).toHaveBeenCalledWith([
      "BTCUSDT",
    ]);
  });

  it("supports closing the stream", () => {
    const stream = createMockStream();

    stream.close();

    expect(stream.close).toHaveBeenCalledOnce();
  });
});

describe("Market Data Stream events", () => {
  it("delivers normalized market data events", async () => {
    const handler = vi.fn();

    const stream: MarketDataStream = {
      subscribe: vi.fn(async () => {}),
      unsubscribe: vi.fn(async () => {}),
      close: vi.fn(),
      onMarketData: vi.fn(() => {
        handler({
          exchange: "binance",
          symbol: "BTCUSDT",
          price: 100000,
          timestamp: 1756200000000,
        });

        return () => {};
      }),
    };

    stream.onMarketData(handler);

    expect(handler).toHaveBeenCalledWith({
      exchange: "binance",
      symbol: "BTCUSDT",
      price: 100000,
      timestamp: 1756200000000,
    });
  });
});

describe("Market Data Stream subscriber behavior", () => {
  it("returns an unsubscribe function from onMarketData", () => {
    const stream = createMockStream();

    const unsubscribe = stream.onMarketData(() => {});

    expect(typeof unsubscribe).toBe("function");
  });

  it("supports multiple market data subscribers", () => {
    const first = vi.fn();
    const second = vi.fn();

    const stream = createMockStream();

    stream.onMarketData(first);
    stream.onMarketData(second);

    expect(stream.onMarketData).toHaveBeenCalledTimes(2);
  });

  it("allows an individual subscriber to unsubscribe", () => {
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribeFirst = vi.fn();

    const stream: MarketDataStream = {
      subscribe: vi.fn(async () => {}),
      unsubscribe: vi.fn(async () => {}),
      close: vi.fn(),
      onMarketData: vi.fn((handler) => {
        if (handler === first) {
          return unsubscribeFirst;
        }

        return () => {};
      }),
    };

    const remove = stream.onMarketData(first);

    stream.onMarketData(second);

    remove();

    expect(unsubscribeFirst).toHaveBeenCalledOnce();
  });
});
