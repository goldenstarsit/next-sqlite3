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

export function validateExchangeConfig(
  config: ExchangeConfig,
): void {
  if (!config.enabled) return;

  if (!config.credentials) {
    throw new Error(
      `Credentials are required for enabled exchange: ${config.id}`,
    );
  }

  if (!config.credentials.apiKey.trim()) {
    throw new Error(
      `API key is required for enabled exchange: ${config.id}`,
    );
  }

  if (!config.credentials.apiSecret.trim()) {
    throw new Error(
      `API secret is required for enabled exchange: ${config.id}`,
    );
  }
}

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


export function cloneExchangeConfig(
  config: ExchangeConfig,
): ExchangeConfig {
  return {
    ...config,
    credentials: config.credentials
      ? {
          ...config.credentials,
        }
      : undefined,
  };
}

export function getDefaultExchangeConfigs(): ExchangeConfig[] {
  return DEFAULT_EXCHANGE_CONFIGS.map(
    cloneExchangeConfig,
  );
}
