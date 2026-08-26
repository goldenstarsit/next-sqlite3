import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { SQLiteDatabase } from "../../src/server/database/adapters/sqlite/SQLiteDatabase";
import { initialMigration } from "../../src/server/database/migrations/001_initial";
import { exchangeConfigsMigration } from "../../src/server/database/migrations/002_exchange_configs";
import { ExchangeConfigRepository } from "../../src/server/database/repositories/ExchangeConfigRepository";
import { ExchangeConfigService } from "../../src/server/exchanges/core/ExchangeConfigService";
import { generateCredentialKey } from "../../src/server/security/CredentialVault";

function createService(): {
  db: SQLiteDatabase;
  service: ExchangeConfigService;
} {
  const db = new SQLiteDatabase(":memory:");

  initialMigration.up(db);
  exchangeConfigsMigration.up(db);

  const repository =
    new ExchangeConfigRepository(db);

  return {
    db,
    service: new ExchangeConfigService(
      repository,
    ),
  };
}

describe("ExchangeConfigService", () => {
  beforeEach(() => {
    process.env.TRADINGBOT_CREDENTIAL_KEY =
      generateCredentialKey();
  });

  it("creates all supported defaults", () => {
    const { db, service } = createService();

    service.ensureDefaults();

    expect(service.list()).toMatchObject([
      {
        exchange: "binance",
        enabled: false,
        hasCredentials: false,
      },
      {
        exchange: "mexc",
        enabled: false,
        hasCredentials: false,
      },
      {
        exchange: "bybit",
        enabled: false,
        hasCredentials: false,
      },
    ]);

    db.close();
  });

  it("does not duplicate defaults", () => {
    const { db, service } = createService();

    service.ensureDefaults();
    service.ensureDefaults();

    expect(service.list()).toHaveLength(3);

    db.close();
  });

  it("does not expose credentials in views", () => {
    const { db, service } = createService();

    service.ensureDefaults();

    service.updateCredentials(
      "binance",
      {
        apiKey: "key",
        apiSecret: "secret",
      },
    );

    const config = service.get("binance");

    expect(config).toEqual(
      expect.objectContaining({
        exchange: "binance",
        hasCredentials: true,
      }),
    );

    expect(config).not.toHaveProperty(
      "api_key",
    );

    expect(config).not.toHaveProperty(
      "api_secret",
    );

    db.close();
  });

  it("rejects enabling an exchange without credentials", () => {
    const { db, service } = createService();

    service.ensureDefaults();

    expect(() =>
      service.enable("mexc"),
    ).toThrow(
      "Credentials are required for enabled exchange: mexc",
    );

    expect(
      service.get("mexc")?.enabled,
    ).toBe(false);

    db.close();
  });

  it("enables an exchange after credentials are stored", () => {
    const { db, service } = createService();

    service.ensureDefaults();

    service.updateCredentials(
      "bybit",
      {
        apiKey: "key",
        apiSecret: "secret",
        passphrase: "pass",
      },
    );

    service.enable("bybit");

    expect(
      service.get("bybit"),
    ).toMatchObject({
      exchange: "bybit",
      enabled: true,
      hasCredentials: true,
    });

    db.close();
  });

  it("disables an enabled exchange", () => {
    const { db, service } = createService();

    service.ensureDefaults();

    service.updateCredentials(
      "binance",
      {
        apiKey: "key",
        apiSecret: "secret",
      },
    );

    service.enable("binance");
    service.disable("binance");

    expect(
      service.get("binance")?.enabled,
    ).toBe(false);

    db.close();
  });

  it("rejects empty credentials", () => {
    const { db, service } = createService();

    service.ensureDefaults();

    expect(() =>
      service.updateCredentials(
        "binance",
        {
          apiKey: " ",
          apiSecret: "secret",
        },
      ),
    ).toThrow("API key is required");

    expect(() =>
      service.updateCredentials(
        "binance",
        {
          apiKey: "key",
          apiSecret: " ",
        },
      ),
    ).toThrow("API secret is required");

    db.close();
  });
});
