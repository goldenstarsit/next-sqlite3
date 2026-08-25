export type ExchangeOrderSide = "BUY" | "SELL";

export type ExchangeOrderType =
  | "MARKET"
  | "LIMIT"
  | "LIMIT_MAKER";

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface SymbolFilter {
  minQty?: number;
  maxQty?: number;
  stepSize?: number;
  minNotional?: number;
  tickSize?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface ExchangeSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  baseAssetPrecision?: number;
  quoteAssetPrecision?: number;
  orderTypes: string[];
  filters: SymbolFilter;
}

export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface ExchangeOrderRequest {
  symbol: string;
  side: ExchangeOrderSide;
  type: ExchangeOrderType;
  quantity?: number;
  quoteOrderQty?: number;
  price?: number;
  clientOrderId?: string;
}

export interface ExchangeOrder {
  symbol: string;
  orderId: string;
  clientOrderId?: string;
  side: ExchangeOrderSide;
  type: ExchangeOrderType;
  status: string;
  price: number;
  originalQuantity: number;
  executedQuantity: number;
  transactTime?: number;
}

export interface Exchange {
  readonly id: string;
  readonly name: string;

  ping(): Promise<boolean>;

  getServerTime(): Promise<number>;

  getSymbol(symbol: string): Promise<ExchangeSymbol>;

  getBalances(): Promise<ExchangeBalance[]>;

  getBalance(asset: string): Promise<ExchangeBalance | undefined>;

  getPrice(symbol: string): Promise<number>;

  createOrder(
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrder>;

  getOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder>;

  cancelOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder>;

  close(): void;
}
