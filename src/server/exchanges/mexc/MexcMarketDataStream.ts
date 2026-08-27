import protobuf from "protobufjs";

import type {
  MarketDataEvent,
  MarketDataHandler,
  MarketDataStream,
} from "../core/market-data";

const BASE_URL =
  "wss://wbs-api.mexc.com/ws";

const CHANNEL =
  "spot@public.aggre.deals.v3.api.pb@100ms";

const OPEN = 1;

interface MexcWebSocket {
  readyState: number;
  send(data: string | ArrayBuffer): void;
  close(): void;

  onopen?: () => void;
  onmessage?: (event: {
    data: string | ArrayBuffer;
  }) => void;
  onerror?: (error: unknown) => void;
  onclose?: () => void;
}

type WebSocketConstructor = new (
  url: string,
) => MexcWebSocket;

interface DecodedTrade {
  price?: string;
  quantity?: string;
  tradeType?: number;
  time?: unknown;
}

interface DecodedMessage {
  channel?: string;
  symbol?: string;
  publicAggreDeals?: {
    deals?: DecodedTrade[];
  };
}

function getWebSocketConstructor(): WebSocketConstructor {
  const WebSocketImpl = globalThis.WebSocket;

  if (!WebSocketImpl) {
    throw new Error(
      "WebSocket is not available in the current runtime.",
    );
  }

  return WebSocketImpl as unknown as WebSocketConstructor;
}

export class MexcMarketDataStream
  implements MarketDataStream
{
  private socket?: MexcWebSocket;

  private readonly symbols = new Set<string>();

  private readonly handlers =
    new Set<MarketDataHandler>();

  private requestId = 0;

  private closed = false;

  private connecting = false;

  private reconnectTimer?: ReturnType<
    typeof setTimeout
  >;

  private heartbeatTimer?: ReturnType<
    typeof setInterval
  >;

  private connectedAt?: number;

  private wrapperType?: protobuf.Type;

  constructor(
    private readonly webSocketConstructor:
      WebSocketConstructor =
        getWebSocketConstructor(),
  ) {}

  async subscribe(
    symbols: string[],
  ): Promise<void> {
    if (this.closed) {
      throw new Error(
        "Cannot subscribe after market data stream is closed.",
      );
    }

    const normalized =
      this.normalizeSymbols(symbols);

    for (const symbol of normalized) {
      this.symbols.add(symbol);
    }

    await this.ensureConnection();

    if (normalized.length === 0) {
      return;
    }

    this.sendSubscription(
      "SUBSCRIPTION",
      normalized.map(
        (symbol) =>
          `${CHANNEL}@${symbol}`,
      ),
    );
  }

  async unsubscribe(
    symbols: string[],
  ): Promise<void> {
    const normalized =
      this.normalizeSymbols(symbols);

    const active = normalized.filter(
      (symbol) =>
        this.symbols.has(symbol),
    );

    for (const symbol of active) {
      this.symbols.delete(symbol);
    }

    if (
      active.length === 0 ||
      !this.socket ||
      this.socket.readyState !== OPEN
    ) {
      return;
    }

    this.sendSubscription(
      "UNSUBSCRIPTION",
      active.map(
        (symbol) =>
          `${CHANNEL}@${symbol}`,
      ),
    );
  }

  onMarketData(
    handler: MarketDataHandler,
  ): () => void {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    this.closed = true;

    this.symbols.clear();

    this.handlers.clear();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.stopHeartbeat();

    const socket = this.socket;

    this.socket = undefined;

    if (socket) {
      socket.close();
    }
  }

  private async ensureConnection(): Promise<void> {
    if (
      this.socket &&
      this.socket.readyState === OPEN
    ) {
      return;
    }

    if (this.connecting) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (
            this.closed ||
            (
              this.socket &&
              this.socket.readyState === OPEN
            )
          ) {
            resolve();
            return;
          }

          setTimeout(check, 5);
        };

        check();
      });

      return;
    }

    this.connecting = true;

    try {
      await new Promise<void>(
        (resolve, reject) => {
          const socket =
            new this.webSocketConstructor(
              BASE_URL,
            );

          this.socket = socket;

          socket.onopen = () => {
            this.connecting = false;

            this.connectedAt =
              Date.now();

            this.startHeartbeat();

            resolve();
          };

          socket.onmessage = (event) => {
            void this.handleMessage(
              event.data,
            );
          };

          socket.onerror = (error) => {
            this.connecting = false;

            reject(
              error instanceof Error
                ? error
                : new Error(
                    "MEXC WebSocket connection failed.",
                  ),
            );
          };

          socket.onclose = () => {
            if (this.socket === socket) {
              this.socket = undefined;
            }

            this.connecting = false;

            this.stopHeartbeat();

            if (
              !this.closed &&
              this.symbols.size > 0
            ) {
              this.scheduleReconnect();
            }
          };
        },
      );
    } catch (error) {
      this.connecting = false;

      this.stopHeartbeat();

      if (this.socket) {
        this.socket.close();
        this.socket = undefined;
      }

      throw error;
    }
  }

  private sendSubscription(
    method:
      | "SUBSCRIPTION"
      | "UNSUBSCRIPTION",
    params: string[],
  ): void {
    if (
      !this.socket ||
      this.socket.readyState !== OPEN ||
      params.length === 0
    ) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        method,
        param: {
          symbol: params,
        },
        id: String(++this.requestId),
      }),
    );
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer =
      setInterval(() => {
        if (
          !this.socket ||
          this.socket.readyState !== OPEN
        ) {
          return;
        }

        this.socket.send(
          JSON.stringify({
            method: "PING",
            id: String(++this.requestId),
          }),
        );
      }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(
        this.heartbeatTimer,
      );

      this.heartbeatTimer =
        undefined;
    }
  }

  private scheduleReconnect(): void {
    if (
      this.closed ||
      this.reconnectTimer ||
      this.symbols.size === 0
    ) {
      return;
    }

    this.reconnectTimer =
      setTimeout(() => {
        this.reconnectTimer =
          undefined;

        if (this.closed) {
          return;
        }

        void this.ensureConnection()
          .catch(() => {
            this.scheduleReconnect();
          });
      }, 1_000);
  }

  private async handleMessage(
    raw: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof raw === "string") {
      return;
    }

    const type =
      await this.getWrapperType();

    let decoded: DecodedMessage;

    try {
      decoded =
        type.decode(
          new Uint8Array(raw),
        ) as unknown as DecodedMessage;
    } catch {
      return;
    }

    if (
      decoded.channel !==
      `${CHANNEL}@${decoded.symbol ?? ""}` &&
      !decoded.publicAggreDeals
    ) {
      return;
    }

    const symbol =
      this.normalizeSymbols([
        decoded.symbol ?? "",
      ])[0];

    if (!symbol) {
      return;
    }

    for (
      const trade of
        decoded.publicAggreDeals?.deals ?? []
    ) {
      const price =
        Number(trade.price);

      const timestamp =
        this.toNumber(trade.time);

      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isFinite(timestamp) ||
        timestamp <= 0
      ) {
        continue;
      }

      const event: MarketDataEvent = {
        exchange: "mexc",
        symbol,
        price,
        timestamp,
      };

      for (
        const handler of [
          ...this.handlers,
        ]
      ) {
        try {
          handler(event);
        } catch {
          // A subscriber must not break the stream.
        }
      }
    }
  }

  private async getWrapperType(): Promise<protobuf.Type> {
    if (this.wrapperType) {
      return this.wrapperType;
    }

    const root =
      await protobuf.load(
        "src/server/exchanges/mexc/proto/MexcMarketDataWrapper.proto",
      );

    this.wrapperType =
      root.lookupType(
        "PushDataV3ApiWrapper",
      );

    return this.wrapperType;
  }

  private toNumber(
    value: unknown,
  ): number {
    if (
      typeof value === "number"
    ) {
      return value;
    }

    if (
      typeof value === "bigint"
    ) {
      return Number(value);
    }

    if (
      value &&
      typeof value === "object" &&
      "toNumber" in value &&
      typeof (
        value as {
          toNumber?: unknown;
        }
      ).toNumber === "function"
    ) {
      return Number(
        (
          value as {
            toNumber: () => number;
          }
        ).toNumber(),
      );
    }

    return Number(value);
  }

  private normalizeSymbols(
    symbols: string[],
  ): string[] {
    return [
      ...new Set(
        symbols
          .map((symbol) =>
            symbol
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ),
    ];
  }
}
