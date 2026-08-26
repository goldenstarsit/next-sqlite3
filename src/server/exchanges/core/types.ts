export type ExchangeOrderSide = "BUY" | "SELL";

export type ExchangeOrderType =
  | "MARKET"
  | "LIMIT"
  | "LIMIT_MAKER";

export type ExchangeOrderStatus =
  | "NEW"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED"
  | "UNKNOWN";

export function normalizeOrderStatus(
  status: string,
): ExchangeOrderStatus {
  switch (status.toUpperCase()) {
    case "NEW":
    case "OPEN":
    case "CREATED":
      return "NEW";

    case "PARTIALLY_FILLED":
    case "PARTIALLYFILLED":
      return "PARTIALLY_FILLED";

    case "FILLED":
      return "FILLED";

    case "CANCELED":
    case "CANCELLED":
      return "CANCELED";

    case "REJECTED":
      return "REJECTED";

    case "EXPIRED":
      return "EXPIRED";

    default:
      return "UNKNOWN";
  }
}

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

export interface ExchangeConfig {
  id: "binance" | "mexc" | "bybit";
  enabled: boolean;
  credentials?: ExchangeCredentials;
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
  status: ExchangeOrderStatus;
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
