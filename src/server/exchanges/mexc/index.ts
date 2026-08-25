import { MexcExchange } from "./MexcExchange";
import type {
  ExchangeCredentials,
} from "../core/types";

export function createMexcExchange(
  credentials?: ExchangeCredentials,
): MexcExchange {
  return new MexcExchange(credentials);
}

export { MexcExchange };
