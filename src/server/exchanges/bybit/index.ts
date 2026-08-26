import {
  BybitExchange,
} from "./BybitExchange";

import type {
  ExchangeCredentials,
} from "../core/types";

export function createBybitExchange(
  credentials?: ExchangeCredentials,
): BybitExchange {
  return new BybitExchange(credentials);
}

export { BybitExchange };
