import { describe, expect, it } from "vitest";

import { MexcMarketDataStream } from "../../src/server/exchanges/mexc/MexcMarketDataStream";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readonly sent: string[] = [];
  readyState = 0;

  onopen?: () => void;
  onmessage?: (event: {
    data: string | ArrayBuffer;
  }) => void;
  onerror?: (error: unknown) => void;
  onclose?: () => void;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string | ArrayBuffer): void {
    this.sent.push(
      typeof data === "string"
        ? data
        : new TextDecoder().decode(data),
    );
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: string | ArrayBuffer): void {
    this.onmessage?.({ data });
  }
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 1_000,
): Promise<void> {
  const started = Date.now();

  while (!condition()) {
    if (Date.now() - started >= timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 5),
    );
  }
}

function makeWrapperBinary(): Uint8Array {
  const bytes = [
    0x0a, 0x27,
    ...new TextEncoder().encode(
      "spot@public.aggre.deals.v3.api.pb@100ms",
    ),
    0x9a, 0x13,
    0x0a, 0x05,
    ...new TextEncoder().encode("BTCUSDT"),
    0x9a, 0x13,
  ];

  return new Uint8Array(bytes);
}

describe("MEXC market data stream", () => {
  it("connects and subscribes to trade streams", async () => {
    FakeWebSocket.instances.length = 0;

    const stream = new MexcMarketDataStream(
      FakeWebSocket as never,
    );

    const subscription = stream.subscribe([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    const socket = FakeWebSocket.instances[0];

    expect(socket.url).toBe(
      "wss://wbs-api.mexc.com/ws",
    );

    socket.open();

    await subscription;

    expect(socket.sent).toHaveLength(1);

    const message = JSON.parse(
      socket.sent[0],
    ) as {
      method: string;
      param: {
        symbol: string[];
      };
      id: string;
    };

    expect(message.method).toBe(
      "SUBSCRIPTION",
    );

    expect(message.param.symbol).toEqual([
      "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
      "spot@public.aggre.deals.v3.api.pb@100ms@ETHUSDT",
    ]);

    stream.close();
  });

  it("normalizes binary trade events", async () => {
    FakeWebSocket.instances.length = 0;

    const stream = new MexcMarketDataStream(
      FakeWebSocket as never,
    );

    const events: unknown[] = [];

    stream.onMarketData((event) => {
      events.push(event);
    });

    const subscription = stream.subscribe([
      "BTCUSDT",
    ]);

    const socket = FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    const protobuf = await import("protobufjs");

    const root = await protobuf.load(
      "src/server/exchanges/mexc/proto/MexcMarketDataWrapper.proto",
    );

    const type = root.lookupType(
      "PushDataV3ApiWrapper",
    );

    const message = type.create({
      channel:
        "spot@public.aggre.deals.v3.api.pb@100ms",
      symbol: "BTCUSDT",
      publicAggreDeals: {
        deals: [
          {
            price: "65000.25",
            quantity: "0.001",
            tradeType: 1,
            time: 1756300000123,
            tradeId: "1",
          },
        ],
      },
    });

    const binary = type.encode(message).finish();

    socket.message(
      new Uint8Array(binary).buffer,
    );

    await waitFor(() => events.length === 1);

    expect(events).toEqual([
      {
        exchange: "mexc",
        symbol: "BTCUSDT",
        price: 65000.25,
        timestamp: 1756300000123,
      },
    ]);

    stream.close();
  });

  it("unsubscribes from selected symbols", async () => {
    FakeWebSocket.instances.length = 0;

    const stream = new MexcMarketDataStream(
      FakeWebSocket as never,
    );

    const subscription = stream.subscribe([
      "BTCUSDT",
      "ETHUSDT",
    ]);

    const socket = FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    await stream.unsubscribe([
      "BTCUSDT",
    ]);

    expect(socket.sent).toHaveLength(2);

    const message = JSON.parse(
      socket.sent[1],
    ) as {
      method: string;
      param: {
        symbol: string[];
      };
    };

    expect(message.method).toBe(
      "UNSUBSCRIPTION",
    );

    expect(message.param.symbol).toEqual([
      "spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT",
    ]);

    stream.close();
  });

  it("supports individual subscriber removal", async () => {
    FakeWebSocket.instances.length = 0;

    const stream = new MexcMarketDataStream(
      FakeWebSocket as never,
    );

    const first: unknown[] = [];
    const second: unknown[] = [];

    const removeFirst = stream.onMarketData(
      (event) => {
        first.push(event);
      },
    );

    stream.onMarketData((event) => {
      second.push(event);
    });

    const subscription = stream.subscribe([
      "BTCUSDT",
    ]);

    const socket = FakeWebSocket.instances[0];

    socket.open();

    await subscription;

    removeFirst();

    const protobuf = await import("protobufjs");

    const root = await protobuf.load(
      "src/server/exchanges/mexc/proto/MexcMarketDataWrapper.proto",
    );

    const type = root.lookupType(
      "PushDataV3ApiWrapper",
    );

    const message = type.create({
      channel:
        "spot@public.aggre.deals.v3.api.pb@100ms",
      symbol: "BTCUSDT",
      publicAggreDeals: {
        deals: [
          {
            price: "65000",
            quantity: "0.001",
            tradeType: 1,
            time: 1756300000123,
            tradeId: "2",
          },
        ],
      },
    });

    const binary = type.encode(message).finish();

    socket.message(
      new Uint8Array(binary).buffer,
    );

    await waitFor(() => second.length === 1);

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);

    stream.close();
  });
});
