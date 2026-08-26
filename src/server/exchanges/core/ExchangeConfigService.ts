import type {
  ExchangeConfig,
} from "./types";

import type {
  ExchangeId,
} from "./registry";

import {
  getDefaultExchangeConfigs,
  validateExchangeConfig,
} from "../../database/../exchanges/core/config";

import {
  ExchangeConfigRepository,
  type StoredExchangeConfig,
} from "../../database/repositories/ExchangeConfigRepository";

export interface ExchangeConfigView {
  id: number;
  exchange: ExchangeId;
  enabled: boolean;
  hasCredentials: boolean;
  created_at: string;
  updated_at: string;
}

function toView(
  config: StoredExchangeConfig,
): ExchangeConfigView {
  return {
    id: config.id,
    exchange: config.exchange as ExchangeId,
    enabled: config.enabled,
    hasCredentials:
      Boolean(config.api_key) &&
      Boolean(config.api_secret),
    created_at: config.created_at,
    updated_at: config.updated_at,
  };
}

export class ExchangeConfigService {
  constructor(
    private readonly repository: ExchangeConfigRepository,
  ) {}

  list(): ExchangeConfigView[] {
    return this.repository
      .findAll()
      .map(toView);
  }

  get(
    exchange: ExchangeId,
  ): ExchangeConfigView | undefined {
    const config =
      this.repository.findByExchange(exchange);

    return config ? toView(config) : undefined;
  }

  ensureDefaults(): void {
    const defaults =
      getDefaultExchangeConfigs();

    for (const config of defaults) {
      if (
        !this.repository.findByExchange(config.id)
      ) {
        this.repository.create(
          config.id,
          config.enabled,
        );
      }
    }
  }

  enable(
    exchange: ExchangeId,
  ): void {
    const config =
      this.repository.findByExchange(exchange);

    if (!config) {
      throw new Error(
        `Exchange config not found: ${exchange}`,
      );
    }

    const candidate: ExchangeConfig = {
      id: exchange,
      enabled: true,
      credentials:
        config.api_key && config.api_secret
          ? {
              apiKey: config.api_key,
              apiSecret: config.api_secret,
              ...(config.passphrase
                ? {
                    passphrase: config.passphrase,
                  }
                : {}),
            }
          : undefined,
    };

    validateExchangeConfig(candidate);

    this.repository.setEnabled(
      exchange,
      true,
    );
  }

  disable(
    exchange: ExchangeId,
  ): void {
    const config =
      this.repository.findByExchange(exchange);

    if (!config) {
      throw new Error(
        `Exchange config not found: ${exchange}`,
      );
    }

    this.repository.setEnabled(
      exchange,
      false,
    );
  }

  updateCredentials(
    exchange: ExchangeId,
    credentials: {
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
    },
  ): void {
    if (!credentials.apiKey.trim()) {
      throw new Error("API key is required");
    }

    if (!credentials.apiSecret.trim()) {
      throw new Error("API secret is required");
    }

    const config =
      this.repository.findByExchange(exchange);

    if (!config) {
      throw new Error(
        `Exchange config not found: ${exchange}`,
      );
    }

    this.repository.updateCredentials(
      exchange,
      credentials,
    );
  }
}
