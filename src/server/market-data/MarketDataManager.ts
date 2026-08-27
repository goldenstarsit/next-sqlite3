import type {
  MarketDataEvent,
  MarketDataHandler,
  MarketDataStream,
} from "../exchanges/core/market-data";

export class MarketDataManager {
  private readonly streams: MarketDataStream[];
  private readonly handlers = new Set<MarketDataHandler>();
  private readonly removers: (() => void)[] = [];
  private closed = false;

  constructor(streams: MarketDataStream[]) {
    this.streams = [...streams];

    for (const stream of this.streams) {
      const remove = stream.onMarketData(
        (event) => this.handleMarketData(event),
      );

      this.removers.push(remove);
    }
  }

  async subscribe(
    symbols: string[],
  ): Promise<void> {
    this.ensureOpen();

    await Promise.all(
      this.streams.map((stream) =>
        stream.subscribe(symbols),
      ),
    );
  }

  async unsubscribe(
    symbols: string[],
  ): Promise<void> {
    this.ensureOpen();

    await Promise.all(
      this.streams.map((stream) =>
        stream.unsubscribe(symbols),
      ),
    );
  }

  onMarketData(
    handler: MarketDataHandler,
  ): () => void {
    this.ensureOpen();

    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const remove of this.removers) {
      remove();
    }

    this.removers.length = 0;
    this.handlers.clear();

    for (const stream of this.streams) {
      stream.close();
    }
  }

  private handleMarketData(
    event: MarketDataEvent,
  ): void {
    if (this.closed) {
      return;
    }

    for (const handler of this.handlers) {
      handler(event);
    }
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new Error(
        "Market data manager is closed",
      );
    }
  }
}
