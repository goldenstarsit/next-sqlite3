import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  MarketDataManager,
} from "../../src/server/market-data/MarketDataManager";

import type {
  MarketDataEvent,
  MarketDataHandler,
  MarketDataStream,
} from "../../src/server/exchanges/core/market-data";

function createMockStream(): {
  stream: MarketDataStream;
  emit: (event: MarketDataEvent) => void;
} {
  const handlers = new Set<MarketDataHandler>();

  const stream: MarketDataStream = {
    subscribe: vi.fn(async () => {}),
    unsubscribe: vi.fn(async () => {}),
    onMarketData: vi.fn((handler) => {
      handlers.add(handler);

      return () => {
        handlers.delete(handler);
      };
    }),
    close: vi.fn(),
  };

  return {
    stream,
    emit: (event) => {
      for (const handler of handlers) {
        handler(event);
      }
    },
  };
}

describe("MarketDataManager", () => {
  it("subscribes all underlying streams", async () => {
    const first = createMockStream();
    const second = createMockStream();

    const manager = new MarketDataManager([
      first.stream,
      second.stream,
    ]);

    await manager.subscribe([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    expect(first.stream.subscribe).toHaveBeenCalledWith([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    expect(second.stream.subscribe).toHaveBeenCalledWith([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    manager.close();
  });

  it("does not subscribe the same symbol twice", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    await manager.subscribe(["BTCUSDT"]);
    await manager.subscribe(["BTCUSDT"]);

    expect(stream.stream.subscribe)
      .toHaveBeenCalledTimes(1);

    expect(stream.stream.subscribe)
      .toHaveBeenCalledWith(["BTCUSDT"]);

    manager.close();
  });

  it("subscribes only new symbols", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    await manager.subscribe([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    await manager.subscribe([
      "BTCUSDT",
      "SOLUSDT",
    ]);

    expect(stream.stream.subscribe)
      .toHaveBeenNthCalledWith(
        1,
        ["BTCUSDT", "ETHUSDT"],
      );

    expect(stream.stream.subscribe)
      .toHaveBeenNthCalledWith(
        2,
        ["SOLUSDT"],
      );

    manager.close();
  });

  it("deduplicates symbols within one subscription", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    await manager.subscribe([
      "btcusdt",
      "BTCUSDT",
      " ethusdt ",
      "ETHUSDT",
    ]);

    expect(stream.stream.subscribe)
      .toHaveBeenCalledWith([
        "BTCUSDT",
        "ETHUSDT",
      ]);

    manager.close();
  });

  it("unsubscribes all underlying streams", async () => {
    const first = createMockStream();
    const second = createMockStream();

    const manager = new MarketDataManager([
      first.stream,
      second.stream,
    ]);

    await manager.subscribe([
      "BTCUSDT",
    ]);

    await manager.unsubscribe([
      "BTCUSDT",
    ]);

    expect(first.stream.unsubscribe)
      .toHaveBeenCalledWith(["BTCUSDT"]);

    expect(second.stream.unsubscribe)
      .toHaveBeenCalledWith(["BTCUSDT"]);

    manager.close();
  });

  it("routes events from all exchanges", () => {
    const binance = createMockStream();
    const mexc = createMockStream();
    const bybit = createMockStream();

    const manager = new MarketDataManager([
      binance.stream,
      mexc.stream,
      bybit.stream,
    ]);

    const handler = vi.fn();

    manager.onMarketData(handler);

    const binanceEvent: MarketDataEvent = {
      exchange: "binance",
      symbol: "BTCUSDT",
      price: 65000,
      timestamp: 1756300000000,
    };

    const mexcEvent: MarketDataEvent = {
      exchange: "mexc",
      symbol: "BTCUSDT",
      price: 65001,
      timestamp: 1756300000100,
    };

    const bybitEvent: MarketDataEvent = {
      exchange: "bybit",
      symbol: "BTCUSDT",
      price: 64999,
      timestamp: 1756300000200,
    };

    binance.emit(binanceEvent);
    mexc.emit(mexcEvent);
    bybit.emit(bybitEvent);

    expect(handler).toHaveBeenCalledTimes(3);

    expect(handler).toHaveBeenNthCalledWith(
      1,
      binanceEvent,
    );

    expect(handler).toHaveBeenNthCalledWith(
      2,
      mexcEvent,
    );

    expect(handler).toHaveBeenNthCalledWith(
      3,
      bybitEvent,
    );

    manager.close();
  });

  it("unsubscribes only active symbols", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    await manager.subscribe([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    await manager.unsubscribe([
      "BTCUSDT",
      "SOLUSDT",
    ]);

    expect(stream.stream.unsubscribe)
      .toHaveBeenCalledTimes(1);

    expect(stream.stream.unsubscribe)
      .toHaveBeenCalledWith([
        "BTCUSDT",
      ]);

    manager.close();
  });

  it("does not unsubscribe an inactive symbol", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    await manager.unsubscribe([
      "BTCUSDT",
    ]);

    expect(stream.stream.unsubscribe)
      .not.toHaveBeenCalled();

    manager.close();
  });

  it("allows a symbol to be subscribed again after unsubscribe", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    await manager.subscribe(["BTCUSDT"]);
    await manager.unsubscribe(["BTCUSDT"]);
    await manager.subscribe(["BTCUSDT"]);

    expect(stream.stream.subscribe)
      .toHaveBeenCalledTimes(2);

    expect(stream.stream.unsubscribe)
      .toHaveBeenCalledTimes(1);

    manager.close();
  });

  it("supports individual manager subscriber removal", () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    const first = vi.fn();
    const second = vi.fn();

    const removeFirst =
      manager.onMarketData(first);

    manager.onMarketData(second);

    removeFirst();

    stream.emit({
      exchange: "mexc",
      symbol: "BTCUSDT",
      price: 65000,
      timestamp: 1756300000000,
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();

    manager.close();
  });

  it("closes all underlying streams", () => {
    const first = createMockStream();
    const second = createMockStream();

    const manager = new MarketDataManager([
      first.stream,
      second.stream,
    ]);

    manager.close();

    expect(first.stream.close)
      .toHaveBeenCalledOnce();

    expect(second.stream.close)
      .toHaveBeenCalledOnce();
  });

  it("is safe to close more than once", () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    manager.close();
    manager.close();

    expect(stream.stream.close)
      .toHaveBeenCalledOnce();
  });

  it("rejects operations after close", async () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    manager.close();

    await expect(
      manager.subscribe(["BTCUSDT"]),
    ).rejects.toThrow(
      "Market data manager is closed",
    );

    await expect(
      manager.unsubscribe(["BTCUSDT"]),
    ).rejects.toThrow(
      "Market data manager is closed",
    );

    expect(() =>
      manager.onMarketData(() => {}),
    ).toThrow(
      "Market data manager is closed",
    );
  });

  it("removes underlying stream subscriptions on close", () => {
    const stream = createMockStream();

    const manager = new MarketDataManager([
      stream.stream,
    ]);

    const handler = vi.fn();

    manager.onMarketData(handler);

    manager.close();

    stream.emit({
      exchange: "mexc",
      symbol: "BTCUSDT",
      price: 65000,
      timestamp: 1756300000000,
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
