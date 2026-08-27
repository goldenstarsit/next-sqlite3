import { ExchangeError, type ExchangeErrorCode } from "../core/ExchangeError";

function mapMexcCode(code: number): ExchangeErrorCode {
  switch (code) {
    case 700002:
    case 700003:
    case 700005:
    case 700006:
    case 700007:
    case 700008:
    case 700009:
      return "INVALID_CREDENTIALS";
    case 30004:
    case 30005:
      return "INSUFFICIENT_BALANCE";
    case 10007:
    case 10009:
      return "INVALID_SYMBOL";
    case 30002:
    case 30003:
    case 30013:
    case 30014:
    case 30015:
    case 30016:
      return "INVALID_QUANTITY";
    case 30010:
    case 30011:
      return "INVALID_PRICE";
    case 429:
      return "RATE_LIMIT";
    case 30000:
      return "ORDER_NOT_FOUND";
    default:
      return "UNKNOWN";
  }
}

export function createMexcError(
  message: string,
  code?: number,
  status?: number,
): ExchangeError {
  return new ExchangeError(
    code === undefined ? "UNKNOWN" : mapMexcCode(code),
    message,
    {
      exchange: "mexc",
      code,
      status,
    },
  );
}
