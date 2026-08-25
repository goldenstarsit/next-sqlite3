export interface ExchangeSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export interface ExchangeOrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price?: number;
}

export interface ExchangeOrder {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: string;
  price: number;
  quantity: number;
}

export interface Exchange {
  readonly name: string;

  getSymbol(symbol: string): Promise<ExchangeSymbol>;

  getPrice(symbol: string): Promise<number>;

  getMinimumOrderAmount(symbol: string): Promise<number>;

  placeOrder(
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrder>;
}
