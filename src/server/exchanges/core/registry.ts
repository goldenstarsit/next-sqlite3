import type {
  Exchange,
  ExchangeCredentials,
} from "./types";

import { createMexcExchange } from "../mexc";
import { createBinanceExchange } from "../binance";

export type ExchangeId =
  | "binance"
  | "mexc";

export function createExchange(
  id: ExchangeId,
  credentials?: ExchangeCredentials,
): Exchange {
  switch (id) {
    case "binance":
      return createBinanceExchange(credentials);

    case "mexc":
      return createMexcExchange(credentials);

    default:
      throw new Error(
        `Unsupported exchange: ${id}`,
      );
  }
}
