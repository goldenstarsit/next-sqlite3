import {
  ExchangeError,
  type ExchangeErrorCode,
} from "../core/ExchangeError";

function mapBinanceCode(
  code: number,
): ExchangeErrorCode {
  switch (code) {
    case -2015:
    case -2014:
      return "INVALID_CREDENTIALS";

    case -2010:
      return "INSUFFICIENT_BALANCE";

    case -1121:
      return "INVALID_SYMBOL";

    case -1013:
      return "INVALID_QUANTITY";

    case -1111:
      return "INVALID_PRICE";

    case -1015:
      return "RATE_LIMIT";

    case -2013:
      return "ORDER_NOT_FOUND";

    default:
      return "UNKNOWN";
  }
}

export function createBinanceError(
  message: string,
  code?: number,
  status?: number,
): ExchangeError {
  return new ExchangeError(
    code === undefined
      ? "UNKNOWN"
      : mapBinanceCode(code),
    message,
    {
      exchange: "binance",
      code,
      status,
    },
  );
}
