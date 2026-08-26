import type {
  ExchangeConfig,
} from "./types";

import {
  SUPPORTED_EXCHANGES,
  type ExchangeId,
} from "./registry";

export const DEFAULT_EXCHANGE_CONFIGS: readonly ExchangeConfig[] =
  SUPPORTED_EXCHANGES.map((id) => ({
    id,
    enabled: false,
  }));

export function getDefaultExchangeConfig(
  id: ExchangeId,
): ExchangeConfig {
  const config = DEFAULT_EXCHANGE_CONFIGS.find(
    (item) => item.id === id,
  );

  if (!config) {
    throw new Error(
      `Unsupported exchange: ${id}`,
    );
  }

  return {
    ...config,
  };
}
