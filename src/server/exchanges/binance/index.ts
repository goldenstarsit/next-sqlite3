export * from "./BinanceExchange";
export * from "./BinanceFilters";

import type {
  Exchange,
  ExchangeCredentials,
} from "../core/types";

import { BinanceExchange } from "./BinanceExchange";

export function createBinanceExchange(
  credentials?: ExchangeCredentials,
): Exchange {
  return new BinanceExchange(credentials);
}
