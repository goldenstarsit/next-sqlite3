import { describe, expect, it } from "vitest";
import { SQLiteDatabase } from "../../src/server/database/adapters/sqlite/SQLiteDatabase";

function createTestDatabase(): SQLiteDatabase {
  return new SQLiteDatabase(":memory:");
}

describe("SQLiteDatabase", () => {
  it("opens and closes the database", () => {
    const db = createTestDatabase();

    expect(db.isOpen()).toBe(true);

    db.close();

    expect(db.isOpen()).toBe(false);
  });

  it("runs parameterized statements", () => {
    const db = createTestDatabase();

    db.execute(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    const result = db.run(
      "INSERT INTO items (name) VALUES (?)",
      ["BTC"],
    );

    expect(result.changes).toBe(1);
    expect(Number(result.lastInsertId)).toBe(1);

    const item = db.get<{ id: number; name: string }>(
      "SELECT id, name FROM items WHERE id = ?",
      [1],
    );

    expect(item).toEqual({
      id: 1,
      name: "BTC",
    });

    db.close();
  });

  it("returns all matching rows", () => {
    const db = createTestDatabase();

    db.execute(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    db.run(
      "INSERT INTO items (name) VALUES (?)",
      ["BTC"],
    );

    db.run(
      "INSERT INTO items (name) VALUES (?)",
      ["ETH"],
    );

    const items = db.all<{ id: number; name: string }>(
      "SELECT id, name FROM items ORDER BY id",
    );

    expect(items).toEqual([
      { id: 1, name: "BTC" },
      { id: 2, name: "ETH" },
    ]);

    db.close();
  });

  it("commits successful transactions", () => {
    const db = createTestDatabase();

    db.execute(`
      CREATE TABLE balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset TEXT NOT NULL,
        amount REAL NOT NULL
      )
    `);

    db.transaction((tx) => {
      tx.run(
        "INSERT INTO balances (asset, amount) VALUES (?, ?)",
        ["BTC", 1.5],
      );

      tx.run(
        "INSERT INTO balances (asset, amount) VALUES (?, ?)",
        ["USDT", 100],
      );
    });

    const rows = db.all(
      "SELECT asset, amount FROM balances ORDER BY id",
    );

    expect(rows).toEqual([
      { asset: "BTC", amount: 1.5 },
      { asset: "USDT", amount: 100 },
    ]);

    db.close();
  });

  it("rolls back failed transactions", () => {
    const db = createTestDatabase();

    db.execute(`
      CREATE TABLE balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL
      )
    `);

    expect(() => {
      db.transaction((tx) => {
        tx.run(
          "INSERT INTO balances (asset, amount) VALUES (?, ?)",
          ["BTC", 1.5],
        );

        tx.run(
          "INSERT INTO balances (asset, amount) VALUES (?, ?)",
          ["BTC", 2],
        );
      });
    }).toThrow();

    const rows = db.all(
      "SELECT asset, amount FROM balances",
    );

    expect(rows).toEqual([]);

    db.close();
  });

  it("enforces foreign keys", () => {
    const db = createTestDatabase();

    db.execute(`
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      )
    `);

    db.execute(`
      CREATE TABLE balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (account_id)
          REFERENCES accounts(id)
      )
    `);

    expect(() => {
      db.run(
        `
          INSERT INTO balances (
            account_id,
            amount
          )
          VALUES (?, ?)
        `,
        [999, 100],
      );
    }).toThrow();

    db.close();
  });
});
