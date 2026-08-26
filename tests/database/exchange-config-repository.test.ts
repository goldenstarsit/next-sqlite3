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
import { generateCredentialKey } from "../../src/server/security/CredentialVault";

beforeEach(() => {
  process.env.TRADINGBOT_CREDENTIAL_KEY =
    generateCredentialKey();
});

function createTestDatabase(): SQLiteDatabase {
  const db = new SQLiteDatabase(":memory:");

  initialMigration.up(db);
  exchangeConfigsMigration.up(db);

  return db;
}

describe("ExchangeConfigRepository", () => {
  it("creates a disabled exchange config", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    const id = repository.create("binance");

    expect(id).toBe(1);

    expect(repository.findByExchange("binance")).toMatchObject({
      id: 1,
      exchange: "binance",
      enabled: false,
    });

    db.close();
  });

  it("creates an enabled exchange config", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    repository.create("mexc", true);

    expect(
      repository.findByExchange("mexc")?.enabled,
    ).toBe(true);

    db.close();
  });

  it("returns all exchange configs", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    repository.create("binance");
    repository.create("mexc");
    repository.create("bybit");

    expect(repository.findAll()).toHaveLength(3);

    expect(
      repository.findAll().map((config) => config.exchange),
    ).toEqual([
      "binance",
      "mexc",
      "bybit",
    ]);

    db.close();
  });

  it("returns undefined for an unknown exchange", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    expect(
      repository.findByExchange("unknown"),
    ).toBeUndefined();

    db.close();
  });

  it("updates enabled state", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    repository.create("binance");

    repository.setEnabled("binance", true);

    expect(
      repository.findByExchange("binance")?.enabled,
    ).toBe(true);

    repository.setEnabled("binance", false);

    expect(
      repository.findByExchange("binance")?.enabled,
    ).toBe(false);

    db.close();
  });

  it("stores credentials encrypted and returns decrypted values", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    repository.create("bybit", true);

    repository.updateCredentials("bybit", {
      apiKey: "key",
      apiSecret: "secret",
      passphrase: "pass",
    });

    expect(
      repository.findByExchange("bybit"),
    ).toMatchObject({
      exchange: "bybit",
      enabled: true,
      api_key: "key",
      api_secret: "secret",
      passphrase: "pass",
    });

    const raw = db.get<{
      api_key: string;
      api_secret: string;
      passphrase: string;
    }>(
      `
        SELECT
          api_key,
          api_secret,
          passphrase
        FROM exchange_configs
        WHERE exchange = ?
      `,
      ["bybit"],
    );

    expect(raw).toBeDefined();
    expect(raw?.api_key).not.toBe("key");
    expect(raw?.api_secret).not.toBe("secret");
    expect(raw?.passphrase).not.toBe("pass");

    db.close();
  });

  it("supports credentials without a passphrase", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    repository.create("binance");

    repository.updateCredentials("binance", {
      apiKey: "key",
      apiSecret: "secret",
    });

    expect(
      repository.findByExchange("binance"),
    ).toMatchObject({
      api_key: "key",
      api_secret: "secret",
    });

    expect(
      repository.findByExchange("binance")?.passphrase,
    ).toBeUndefined();

    const raw = db.get<{
      api_key: string;
      api_secret: string;
      passphrase: string | null;
    }>(
      `
        SELECT
          api_key,
          api_secret,
          passphrase
        FROM exchange_configs
        WHERE exchange = ?
      `,
      ["binance"],
    );

    expect(raw?.api_key).not.toBe("key");
    expect(raw?.api_secret).not.toBe("secret");
    expect(raw?.passphrase).toBeNull();

    db.close();
  });

  it("rejects duplicate exchanges", () => {
    const db = createTestDatabase();
    const repository = new ExchangeConfigRepository(db);

    repository.create("binance");

    expect(() =>
      repository.create("binance"),
    ).toThrow();

    db.close();
  });
});
