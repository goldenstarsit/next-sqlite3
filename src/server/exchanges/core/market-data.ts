export interface MarketDataEvent {
  exchange: string;
  symbol: string;
  price: number;
  timestamp: number;
}

export type MarketDataHandler = (
  event: MarketDataEvent,
) => void;

export interface MarketDataStream {
  subscribe(
    symbols: string[],
  ): Promise<void>;

  unsubscribe(
    symbols: string[],
  ): Promise<void>;

  onMarketData(
    handler: MarketDataHandler,
  ): () => void;

  close(): void;
}
