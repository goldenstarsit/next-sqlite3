import type { Migration } from "./Migration";

export const tradingMigration: Migration = {
  version: 3,
  name: "trading",

  up(db) {
    db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exchange TEXT NOT NULL,
        symbol TEXT NOT NULL,
        order_id TEXT NOT NULL,
        client_order_id TEXT,
        side TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        original_quantity REAL NOT NULL DEFAULT 0,
        executed_quantity REAL NOT NULL DEFAULT 0,
        transact_time INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exchange, order_id)
      )
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_orders_symbol
      ON orders(symbol)
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_orders_status
      ON orders(status)
    `);

    db.execute(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exchange TEXT NOT NULL,
        symbol TEXT NOT NULL,
        order_id TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        quote_quantity REAL NOT NULL,
        fee REAL NOT NULL DEFAULT 0,
        fee_asset TEXT,
        realized_pnl REAL,
        executed_at INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_trades_symbol
      ON trades(symbol)
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_trades_order
      ON trades(exchange, order_id)
    `);

    db.execute(`
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exchange TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        entry_price REAL NOT NULL,
        current_price REAL,
        realized_pnl REAL NOT NULL DEFAULT 0,
        unrealized_pnl REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'OPEN',
        opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exchange, symbol, status)
      )
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_positions_status
      ON positions(status)
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_positions_symbol
      ON positions(symbol)
    `);
  },
};
