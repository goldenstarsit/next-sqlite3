import type { Migration } from "./Migration";

export const exchangeConfigsMigration: Migration = {
  version: 2,
  name: "exchange_configs",

  up(db) {
    db.execute(`
      CREATE TABLE IF NOT EXISTS exchange_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exchange TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 0,
        api_key TEXT,
        api_secret TEXT,
        passphrase TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
};
