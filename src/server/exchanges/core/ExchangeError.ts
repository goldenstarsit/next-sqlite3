export type ExchangeErrorCode =
  | "INVALID_CREDENTIALS"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_SYMBOL"
  | "INVALID_QUANTITY"
  | "INVALID_PRICE"
  | "MIN_NOTIONAL"
  | "RATE_LIMIT"
  | "ORDER_NOT_FOUND"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNSUPPORTED_OPERATION"
  | "EXCHANGE_UNAVAILABLE"
  | "UNKNOWN";

export interface ExchangeErrorDetails {
  exchange?: string;
  code?: string | number;
  status?: number;
  cause?: unknown;
}

export class ExchangeError extends Error {
  readonly code: ExchangeErrorCode;
  readonly exchange?: string;
  readonly exchangeCode?: string | number;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    code: ExchangeErrorCode,
    message: string,
    details: ExchangeErrorDetails = {},
  ) {
    super(message);

    this.name = "ExchangeError";
    this.code = code;
    this.exchange = details.exchange;
    this.exchangeCode = details.code;
    this.status = details.status;
    this.cause = details.cause;
  }
}

export function isExchangeError(
  error: unknown,
): error is ExchangeError {
  return error instanceof ExchangeError;
}

export function normalizeExchangeError(
  error: unknown,
  exchange?: string,
): ExchangeError {
  if (error instanceof ExchangeError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ExchangeError(
      "NETWORK_ERROR",
      error.message,
      {
        exchange,
        cause: error,
      },
    );
  }

  if (error instanceof Error) {
    return new ExchangeError(
      "UNKNOWN",
      error.message,
      {
        exchange,
        cause: error,
      },
    );
  }

  return new ExchangeError(
    "UNKNOWN",
    String(error),
    {
      exchange,
      cause: error,
    },
  );
}
