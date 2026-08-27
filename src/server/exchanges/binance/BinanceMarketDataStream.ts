import type {
  MarketDataEvent,
  MarketDataHandler,
  MarketDataStream,
} from "../core/market-data";

const BASE_URL = "wss://stream.binance.com:9443/ws";

interface BinanceTradeEvent {
  e: "trade";
  E: number;
  s: string;
  p: string;
}

interface BinanceWebSocket {
  readyState: number;
  send(data: string): void;
  close(): void;

  onopen?: () => void;
  onmessage?: (event: { data: string | ArrayBuffer }) => void;
  onerror?: (error: unknown) => void;
  onclose?: () => void;
}

type WebSocketConstructor = new (
  url: string,
) => BinanceWebSocket;

const OPEN = 1;

function getWebSocketConstructor(): WebSocketConstructor {
  const WebSocketImpl = globalThis.WebSocket;

  if (!WebSocketImpl) {
    throw new Error(
      "WebSocket is not available in the current runtime.",
    );
  }

  return WebSocketImpl as unknown as WebSocketConstructor;
}

export class BinanceMarketDataStream
  implements MarketDataStream
{
  private socket?: BinanceWebSocket;

  private readonly symbols = new Set<string>();

  private readonly handlers = new Set<MarketDataHandler>();

  private requestId = 0;

  private closed = false;

  private connecting = false;

  constructor(
    private readonly webSocketConstructor: WebSocketConstructor =
      getWebSocketConstructor(),
  ) {}

  async subscribe(symbols: string[]): Promise<void> {
    if (this.closed) {
      throw new Error(
        "Cannot subscribe after market data stream is closed.",
      );
    }

    const normalized = this.normalizeSymbols(symbols);

    for (const symbol of normalized) {
      this.symbols.add(symbol);
    }

    await this.ensureConnection();

    if (normalized.length === 0) {
      return;
    }

    this.sendSubscription(
      "SUBSCRIBE",
      normalized.map(
        (symbol) => `${symbol}@trade`,
      ),
    );
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    const normalized = this.normalizeSymbols(symbols);

    const active = normalized.filter((symbol) =>
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
      "UNSUBSCRIBE",
      active.map(
        (symbol) => `${symbol}@trade`,
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
      await new Promise<void>((resolve, reject) => {
        const socket = new this.webSocketConstructor(
          BASE_URL,
        );

        this.socket = socket;

        socket.onopen = () => {
          this.connecting = false;
          resolve();
        };

        socket.onmessage = (event) => {
          void this.handleMessage(event.data);
        };

        socket.onerror = (error) => {
          this.connecting = false;

          reject(
            error instanceof Error
              ? error
              : new Error(
                  "Binance WebSocket connection failed.",
                ),
          );
        };

        socket.onclose = () => {
          if (this.socket === socket) {
            this.socket = undefined;
          }

          this.connecting = false;

          if (
            !this.closed &&
            this.symbols.size > 0
          ) {
            void this.reconnect();
          }
        };
      });
    } catch (error) {
      this.connecting = false;

      if (this.socket) {
        this.socket.close();
        this.socket = undefined;
      }

      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    if (
      this.closed ||
      this.symbols.size === 0
    ) {
      return;
    }

    await new Promise<void>((resolve) =>
      setTimeout(resolve, 1000),
    );

    if (this.closed) {
      return;
    }

    try {
      await this.ensureConnection();
    } catch {
      if (!this.closed) {
        void this.reconnect();
      }
    }
  }

  private sendSubscription(
    method: "SUBSCRIBE" | "UNSUBSCRIBE",
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
        params,
        id: ++this.requestId,
      }),
    );
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

    if (!this.isTradeEvent(data)) {
      return;
    }

    const event: MarketDataEvent = {
      exchange: "binance",
      symbol: data.s,
      price: Number(data.p),
      timestamp: data.E,
    };

    if (
      !Number.isFinite(event.price) ||
      event.price <= 0
    ) {
      return;
    }

    for (const handler of [...this.handlers]) {
      try {
        handler(event);
      } catch {
        // A subscriber must not break the stream.
      }
    }
  }

  private normalizeSymbols(
    symbols: string[],
  ): string[] {
    return [
      ...new Set(
        symbols
          .map((symbol) =>
            symbol.trim().toLowerCase(),
          )
          .filter(Boolean),
      ),
    ];
  }

  private isTradeEvent(
    value: unknown,
  ): value is BinanceTradeEvent {
    if (
      typeof value !== "object" ||
      value === null
    ) {
      return false;
    }

    const data =
      value as Record<string, unknown>;

    return (
      data.e === "trade" &&
      typeof data.E === "number" &&
      typeof data.s === "string" &&
      typeof data.p === "string"
    );
  }
}
