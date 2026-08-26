import { describe, expect, it } from "vitest";
import { SQLiteDatabase } from "../../src/server/database/adapters/sqlite/SQLiteDatabase";
import {
  ensureMigrationTable,
  runMigrations,
} from "../../src/server/database/migrations/runner";
import type { Migration } from "../../src/server/database/migrations/Migration";

function createTestDatabase(): SQLiteDatabase {
  return new SQLiteDatabase(":memory:");
}

describe("Migration runner", () => {
  it("creates the schema migrations table", () => {
    const db = createTestDatabase();

    ensureMigrationTable(db);

    const table = db.get<{ name: string }>(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'schema_migrations'
      `,
    );

    expect(table).toEqual({
      name: "schema_migrations",
    });

    db.close();
  });

  it("runs migrations in version order", () => {
    const db = createTestDatabase();
    const calls: number[] = [];

    const migrations: Migration[] = [
      {
        version: 2,
        name: "second",
        up() {
          calls.push(2);
        },
      },
      {
        version: 1,
        name: "first",
        up() {
          calls.push(1);
        },
      },
    ];

    runMigrations(db, migrations);

    expect(calls).toEqual([1, 2]);

    const rows = db.all(
      `
        SELECT version, name
        FROM schema_migrations
        ORDER BY version
      `,
    );

    expect(rows).toEqual([
      { version: 1, name: "first" },
      { version: 2, name: "second" },
    ]);

    db.close();
  });

  it("does not run already applied migrations", () => {
    const db = createTestDatabase();
    let calls = 0;

    const migration: Migration = {
      version: 1,
      name: "initial",
      up() {
        calls += 1;
      },
    };

    runMigrations(db, [migration]);
    runMigrations(db, [migration]);

    expect(calls).toBe(1);

    const rows = db.all(
      "SELECT version FROM schema_migrations",
    );

    expect(rows).toEqual([{ version: 1 }]);

    db.close();
  });

  it("rejects duplicate migration versions", () => {
    const db = createTestDatabase();

    const migrations: Migration[] = [
      {
        version: 1,
        name: "first",
        up() {},
      },
      {
        version: 1,
        name: "second",
        up() {},
      },
    ];

    expect(() =>
      runMigrations(db, migrations),
    ).toThrow("Duplicate migration version: 1");

    db.close();
  });

  it("rejects duplicate migration names", () => {
    const db = createTestDatabase();

    const migrations: Migration[] = [
      {
        version: 1,
        name: "same",
        up() {},
      },
      {
        version: 2,
        name: "same",
        up() {},
      },
    ];

    expect(() =>
      runMigrations(db, migrations),
    ).toThrow("Duplicate migration name: same");

    db.close();
  });

  it("rejects invalid migration versions", () => {
    const db = createTestDatabase();

    expect(() =>
      runMigrations(db, [
        {
          version: 0,
          name: "invalid",
          up() {},
        },
      ]),
    ).toThrow("Invalid migration version: 0");

    db.close();
  });

  it("rejects empty migration names", () => {
    const db = createTestDatabase();

    expect(() =>
      runMigrations(db, [
        {
          version: 1,
          name: "   ",
          up() {},
        },
      ]),
    ).toThrow("Migration 1 has an empty name");

    db.close();
  });

  it("rolls back a failed migration", () => {
    const db = createTestDatabase();

    expect(() =>
      runMigrations(db, [
        {
          version: 1,
          name: "failing",
          up(database) {
            database.execute(`
              CREATE TABLE rollback_test (
                id INTEGER PRIMARY KEY
              )
            `);

            throw new Error("migration failed");
          },
        },
      ]),
    ).toThrow("migration failed");

    const table = db.get(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'rollback_test'
      `,
    );

    expect(table).toBeUndefined();

    const migration = db.get(
      `
        SELECT version
        FROM schema_migrations
        WHERE version = 1
      `,
    );

    expect(migration).toBeUndefined();

    db.close();
  });

  it("is safe to run with no migrations", () => {
    const db = createTestDatabase();

    expect(() =>
      runMigrations(db, []),
    ).not.toThrow();

    const rows = db.all(
      "SELECT version FROM schema_migrations",
    );

    expect(rows).toEqual([]);

    db.close();
  });
});
