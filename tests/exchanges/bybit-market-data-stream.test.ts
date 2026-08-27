import {
  describe,
  expect,
  it,
} from "vitest";

import {
  BybitMarketDataStream,
} from "../../src/server/exchanges/bybit/BybitMarketDataStream";

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

describe("Bybit market data stream", () => {
  it("connects and subscribes to trade streams", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BybitMarketDataStream(
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
      "wss://stream.bybit.com/v5/public/spot",
    );

    socket.open();

    await subscription;

    expect(socket.sent).toHaveLength(1);

    expect(
      JSON.parse(socket.sent[0]),
    ).toMatchObject({
      op: "subscribe",
      args: [
        "publicTrade.BTCUSDT",
        "publicTrade.ETHUSDT",
      ],
    });

    stream.close();
  });

  it("normalizes Bybit trade messages", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BybitMarketDataStream(
        FakeWebSocket as never,
      );

    const events: unknown[] = [];

    stream.onMarketData((event) => {
      events.push(event);
    });

    const subscription =
      stream.subscribe([
        "BTCUSDT",
      ]);

    const socket =
      FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    socket.emit({
      topic: "publicTrade.BTCUSDT",
      type: "snapshot",
      ts: 1770000000123,
      data: [
        {
          T: 1770000000120,
          s: "BTCUSDT",
          S: "Buy",
          v: "0.001",
          p: "65000.1234",
        },
        {
          T: 1770000000123,
          s: "BTCUSDT",
          S: "Sell",
          v: "0.002",
          p: "65001.5000",
        },
      ],
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 0),
    );

    expect(events).toEqual([
      {
        exchange: "bybit",
        symbol: "BTCUSDT",
        price: 65000.1234,
        timestamp: 1770000000120,
      },
      {
        exchange: "bybit",
        symbol: "BTCUSDT",
        price: 65001.5,
        timestamp: 1770000000123,
      },
    ]);

    stream.close();
  });

  it("unsubscribes from selected symbols", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BybitMarketDataStream(
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
      op: "unsubscribe",
      args: [
        "publicTrade.BTCUSDT",
      ],
    });

    stream.close();
  });

  it("supports individual subscriber removal", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BybitMarketDataStream(
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
      stream.subscribe([
        "BTCUSDT",
      ]);

    const socket =
      FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    removeFirst();

    socket.emit({
      topic: "publicTrade.BTCUSDT",
      type: "snapshot",
      data: [
        {
          T: 1770000000123,
          s: "BTCUSDT",
          p: "65000",
        },
      ],
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 0),
    );

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);

    stream.close();
  });

  it("ignores non-trade messages", async () => {
    FakeWebSocket.instances.length = 0;

    const stream =
      new BybitMarketDataStream(
        FakeWebSocket as never,
      );

    const events: unknown[] = [];

    stream.onMarketData((event) => {
      events.push(event);
    });

    const subscription =
      stream.subscribe([
        "BTCUSDT",
      ]);

    const socket =
      FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    socket.emit({
      op: "pong",
      ret_msg: "pong",
    });

    socket.emit({
      topic: "orderbook.1.BTCUSDT",
      type: "snapshot",
      data: {},
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 0),
    );

    expect(events).toHaveLength(0);

    stream.close();
  });
});
