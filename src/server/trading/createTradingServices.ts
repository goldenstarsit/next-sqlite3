import type {
  Exchange,
  ExchangeCredentials,
} from "../exchanges/core/types";

import {
  createExchange,
  type ExchangeId,
} from "../exchanges/core/registry";

import {
  TradingServices,
} from "./TradingServices";

export function createTradingServices(
  exchange: Exchange,
): TradingServices {
  return new TradingServices(exchange);
}

export function createTradingServicesForExchange(
  exchangeId: ExchangeId,
  credentials?: ExchangeCredentials,
): TradingServices {
  const exchange =
    createExchange(
      exchangeId,
      credentials,
    );

  return new TradingServices(exchange);
}
