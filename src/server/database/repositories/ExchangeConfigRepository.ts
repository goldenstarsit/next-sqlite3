import type {
  Database,
} from "../core/types";

import {
  decryptCredential,
  encryptCredential,
} from "../../security/CredentialVault";

export interface StoredExchangeConfig {
  id: number;
  exchange: string;
  enabled: boolean;
  api_key?: string;
  api_secret?: string;
  passphrase?: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangeConfigRepositoryContract {
  create(
    exchange: string,
    enabled?: boolean,
  ): number;

  findByExchange(
    exchange: string,
  ): StoredExchangeConfig | undefined;

  findAll(): StoredExchangeConfig[];

  setEnabled(
    exchange: string,
    enabled: boolean,
  ): void;

  updateCredentials(
    exchange: string,
    credentials: {
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
    },
  ): void;
}

type StoredExchangeConfigRow =
  Omit<StoredExchangeConfig, "enabled"> & {
    enabled: number;
  };

function mapConfig(
  row: StoredExchangeConfigRow,
): StoredExchangeConfig {
  return {
    id: row.id,
    exchange: row.exchange,
    enabled: row.enabled === 1,
    api_key: row.api_key
      ? decryptCredential(row.api_key)
      : undefined,
    api_secret: row.api_secret
      ? decryptCredential(row.api_secret)
      : undefined,
    passphrase: row.passphrase
      ? decryptCredential(row.passphrase)
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class ExchangeConfigRepository
  implements ExchangeConfigRepositoryContract
{
  constructor(
    private readonly db: Database,
  ) {}

  create(
    exchange: string,
    enabled = false,
  ): number {
    const result = this.db.run(
      `
        INSERT INTO exchange_configs (
          exchange,
          enabled
        )
        VALUES (?, ?)
      `,
      [
        exchange,
        enabled ? 1 : 0,
      ],
    );

    return Number(result.lastInsertId);
  }

  findByExchange(
    exchange: string,
  ): StoredExchangeConfig | undefined {
    const row = this.db.get<StoredExchangeConfigRow>(
      `
        SELECT
          id,
          exchange,
          enabled,
          api_key,
          api_secret,
          passphrase,
          created_at,
          updated_at
        FROM exchange_configs
        WHERE exchange = ?
      `,
      [exchange],
    );

    return row ? mapConfig(row) : undefined;
  }

  findAll(): StoredExchangeConfig[] {
    const rows = this.db.all<StoredExchangeConfigRow>(
      `
        SELECT
          id,
          exchange,
          enabled,
          api_key,
          api_secret,
          passphrase,
          created_at,
          updated_at
        FROM exchange_configs
        ORDER BY id
      `,
    );

    return rows.map(mapConfig);
  }

  setEnabled(
    exchange: string,
    enabled: boolean,
  ): void {
    this.db.run(
      `
        UPDATE exchange_configs
        SET
          enabled = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE exchange = ?
      `,
      [
        enabled ? 1 : 0,
        exchange,
      ],
    );
  }

  updateCredentials(
    exchange: string,
    credentials: {
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
    },
  ): void {
    this.db.run(
      `
        UPDATE exchange_configs
        SET
          api_key = ?,
          api_secret = ?,
          passphrase = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE exchange = ?
      `,
      [
        encryptCredential(credentials.apiKey),
        encryptCredential(credentials.apiSecret),
        credentials.passphrase !== undefined
          ? encryptCredential(credentials.passphrase)
          : null,
        exchange,
      ],
    );
  }
}
