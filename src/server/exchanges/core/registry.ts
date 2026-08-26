import type {
  Exchange,
  ExchangeCredentials,
} from "./types";

import { createMexcExchange } from "../mexc";
import { createBinanceExchange } from "../binance";
import { createBybitExchange } from "../bybit";

export type ExchangeId =
  | "binance"
  | "mexc"
  | "bybit";

export function createExchange(
  id: ExchangeId,
  credentials?: ExchangeCredentials,
): Exchange {
  switch (id) {
    case "binance":
      return createBinanceExchange(credentials);

    case "mexc":
      return createMexcExchange(credentials);

    case "bybit":
      return createBybitExchange(credentials);

    default:
      throw new Error(
        `Unsupported exchange: ${id}`,
      );
  }
}
