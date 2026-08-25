import type {
  Database,
  DatabaseTransaction,
} from "../core/types";

import type { Migration } from "./Migration";

export function ensureMigrationTable(
  db: Database,
): void {
  db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

function validateMigrations(
  migrations: Migration[],
): void {
  const versions = new Set<number>();
  const names = new Set<string>();

  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error(
        `Invalid migration version: ${migration.version}`,
      );
    }

    if (!migration.name.trim()) {
      throw new Error(
        `Migration ${migration.version} has an empty name`,
      );
    }

    if (versions.has(migration.version)) {
      throw new Error(
        `Duplicate migration version: ${migration.version}`,
      );
    }

    if (names.has(migration.name)) {
      throw new Error(
        `Duplicate migration name: ${migration.name}`,
      );
    }

    versions.add(migration.version);
    names.add(migration.name);
  }
}

function createMigrationTransaction(
  tx: DatabaseTransaction,
): Database {
  return {
    run: (sql, params = []) =>
      tx.run(sql, params),

    get: <T = unknown>(
      sql: string,
      params = [],
    ) => tx.get<T>(sql, params),

    all: <T = unknown>(
      sql: string,
      params = [],
    ) => tx.all<T>(sql, params),

    execute: (sql, params = []) =>
      tx.execute(sql, params),

    transaction: () => {
      throw new Error(
        "Nested transactions are not supported inside migrations.",
      );
    },

    close: () => {
      throw new Error(
        "Database close is not available inside migrations.",
      );
    },

    isOpen: () => true,
  };
}

export function runMigrations(
  db: Database,
  migrations: Migration[],
): void {
  validateMigrations(migrations);

  ensureMigrationTable(db);

  const applied = new Set(
    db
      .all<{ version: number }>(
        `
          SELECT version
          FROM schema_migrations
          ORDER BY version
        `,
      )
      .map((row) => row.version),
  );

  const pending = [...migrations]
    .filter(
      (migration) => !applied.has(migration.version),
    )
    .sort(
      (a, b) => a.version - b.version,
    );

  for (const migration of pending) {
    db.transaction((tx) => {
      migration.up(
        createMigrationTransaction(tx),
      );

      tx.run(
        `
          INSERT INTO schema_migrations
            (version, name, applied_at)
          VALUES (?, ?, ?)
        `,
        [
          migration.version,
          migration.name,
          new Date().toISOString(),
        ],
      );
    });
  }
}
