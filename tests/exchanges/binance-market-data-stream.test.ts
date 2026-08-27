import { describe, expect, it } from "vitest";

import {
  BinanceMarketDataStream,
} from "../../src/server/exchanges/binance/BinanceMarketDataStream";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readyState = 0;

  sent: string[] = [];

  onopen?: () => void;

  onmessage?: (
    event: { data: string },
  ) => void;

  onerror?: (error: unknown) => void;

  onclose?: () => void;

  constructor(
    readonly url: string,
  ) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  emit(data: unknown): void {
    this.onmessage?.({
      data: JSON.stringify(data),
    });
  }
}

describe("Binance market data stream", () => {
  it("connects and subscribes to trade streams", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BinanceMarketDataStream(
        FakeWebSocket as never,
      );

    const subscription =
      stream.subscribe([
        "BTCUSDT",
        "ETHUSDT",
      ]);

    const socket =
      FakeWebSocket.instances[0];

    expect(socket.url).toBe(
      "wss://stream.binance.com:9443/ws",
    );

    socket.open();

    await subscription;

    expect(socket.sent).toHaveLength(1);

    expect(
      JSON.parse(socket.sent[0]),
    ).toMatchObject({
      method: "SUBSCRIBE",
      params: [
        "btcusdt@trade",
        "ethusdt@trade",
      ],
    });

    stream.close();
  });

  it("normalizes Binance trade events", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BinanceMarketDataStream(
        FakeWebSocket as never,
      );

    const events: unknown[] = [];

    stream.onMarketData((event) => {
      events.push(event);
    });

    const subscription =
      stream.subscribe(["BTCUSDT"]);

    const socket =
      FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    socket.emit({
      e: "trade",
      E: 1770000000123,
      s: "BTCUSDT",
      t: 123456,
      p: "65000.12340000",
      q: "0.001",
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 0),
    );

    expect(events).toEqual([
      {
        exchange: "binance",
        symbol: "BTCUSDT",
        price: 65000.1234,
        timestamp: 1770000000123,
      },
    ]);

    stream.close();
  });

  it("unsubscribes from selected symbols", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BinanceMarketDataStream(
        FakeWebSocket as never,
      );

    const subscription =
      stream.subscribe([
        "BTCUSDT",
        "ETHUSDT",
      ]);

    const socket =
      FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    socket.sent.length = 0;

    await stream.unsubscribe([
      "BTCUSDT",
    ]);

    expect(
      JSON.parse(socket.sent[0]),
    ).toMatchObject({
      method: "UNSUBSCRIBE",
      params: [
        "btcusdt@trade",
      ],
    });

    stream.close();
  });

  it("supports individual subscriber removal", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BinanceMarketDataStream(
        FakeWebSocket as never,
      );

    const first: unknown[] = [];
    const second: unknown[] = [];

    const removeFirst =
      stream.onMarketData((event) => {
        first.push(event);
      });

    stream.onMarketData((event) => {
      second.push(event);
    });

    const subscription =
      stream.subscribe(["BTCUSDT"]);

    const socket =
      FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    removeFirst();

    socket.emit({
      e: "trade",
      E: 1770000000123,
      s: "BTCUSDT",
      p: "65000",
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 0),
    );

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);

    stream.close();
  });
});
