import type {
  MarketDataEvent,
  MarketDataHandler,
  MarketDataStream,
} from "../core/market-data";

const BASE_URL =
  "wss://stream.bybit.com/v5/public/spot";

const OPEN = 1;

interface BybitWebSocket {
  readyState: number;
  send(data: string): void;
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
) => BybitWebSocket;

interface BybitTrade {
  T: number;
  s: string;
  p: string;
}

interface BybitTradeMessage {
  topic?: string;
  type?: string;
  ts?: number;
  data?: BybitTrade[];
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

export class BybitMarketDataStream
  implements MarketDataStream
{
  private socket?: BybitWebSocket;

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
      "subscribe",
      normalized.map(
        (symbol) =>
          `publicTrade.${symbol}`,
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
      "unsubscribe",
      active.map(
        (symbol) =>
          `publicTrade.${symbol}`,
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
                    "Bybit WebSocket connection failed.",
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
    op:
      | "subscribe"
      | "unsubscribe",
    args: string[],
  ): void {
    if (
      !this.socket ||
      this.socket.readyState !== OPEN ||
      args.length === 0
    ) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        req_id: `market-data-${++this.requestId}`,
        op,
        args,
      }),
    );
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer =
      setInterval(() => {
        if (
          this.socket &&
          this.socket.readyState === OPEN
        ) {
          this.socket.send(
            JSON.stringify({
              req_id: `ping-${++this.requestId}`,
              op: "ping",
            }),
          );
        }
      }, 20_000);
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
    const text =
      typeof raw === "string"
        ? raw
        : new TextDecoder().decode(raw);

    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      return;
    }

    if (!this.isTradeMessage(data)) {
      return;
    }

    for (const trade of data.data ?? []) {
      const event: MarketDataEvent = {
        exchange: "bybit",
        symbol: trade.s,
        price: Number(trade.p),
        timestamp: trade.T,
      };

      if (
        !Number.isFinite(event.price) ||
        event.price <= 0 ||
        !Number.isFinite(event.timestamp)
      ) {
        continue;
      }

      for (const handler of [
        ...this.handlers,
      ]) {
        try {
          handler(event);
        } catch {
          // A subscriber must not break the stream.
        }
      }
    }
  }

  private isTradeMessage(
    value: unknown,
  ): value is BybitTradeMessage {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return false;
    }

    const message =
      value as BybitTradeMessage;

    return (
      typeof message.topic === "string" &&
      message.topic.startsWith(
        "publicTrade.",
      ) &&
      Array.isArray(message.data)
    );
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
