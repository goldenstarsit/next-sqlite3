import type {
  Exchange,
  ExchangeSymbol,
} from "../../exchanges/core/types";

export class MarketDataService {
  constructor(
    private readonly exchange: Exchange,
  ) {}

  async getPrice(
    symbol: string,
  ): Promise<number> {
    return this.exchange.getPrice(symbol);
  }

  async getSymbol(
    symbol: string,
  ): Promise<ExchangeSymbol> {
    return this.exchange.getSymbol(symbol);
  }

  async getServerTime(): Promise<number> {
    return this.exchange.getServerTime();
  }

  async ping(): Promise<boolean> {
    return this.exchange.ping();
  }
}
