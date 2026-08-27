import { ExchangeError, type ExchangeErrorCode } from "../core/ExchangeError";

function mapBybitCode(code: number): ExchangeErrorCode {
  switch (code) {
    case 10003:
    case 10004:
    case 10005:
    case 10007:
      return "INVALID_CREDENTIALS";
    case 10006:
    case 429:
      return "RATE_LIMIT";
    case 110001:
    case 110010:
      return "ORDER_NOT_FOUND";
    case 110004:
    case 110007:
      return "INSUFFICIENT_BALANCE";
    case 110003:
      return "INVALID_PRICE";
    default:
      return "UNKNOWN";
  }
}

export function createBybitError(
  message: string,
  code?: number,
  status?: number,
): ExchangeError {
  return new ExchangeError(
    code === undefined ? "UNKNOWN" : mapBybitCode(code),
    message,
    {
      exchange: "bybit",
      code,
      status,
    },
  );
}
