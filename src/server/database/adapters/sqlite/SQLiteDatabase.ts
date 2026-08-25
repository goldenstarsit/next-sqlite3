import DatabaseDriver from "better-sqlite3";

import type {
  Database,
  DatabaseParams,
  DatabaseResult,
  DatabaseTransaction,
} from "../../core/types";

export class SQLiteDatabase implements Database {
  private readonly db: DatabaseDriver.Database;

  constructor(filename: string) {
    this.db = new DatabaseDriver(filename);

    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  run(
    sql: string,
    params: DatabaseParams = [],
  ): DatabaseResult {
    const result = this.db.prepare(sql).run(...params);

    return {
      changes: result.changes,
      lastInsertId: result.lastInsertRowid,
    };
  }

  get<T = unknown>(
    sql: string,
    params: DatabaseParams = [],
  ): T | undefined {
    return this.db
      .prepare(sql)
      .get(...params) as T | undefined;
  }

  all<T = unknown>(
    sql: string,
    params: DatabaseParams = [],
  ): T[] {
    return this.db
      .prepare(sql)
      .all(...params) as T[];
  }

  execute(
    sql: string,
    params: DatabaseParams = [],
  ): DatabaseResult {
    return this.run(sql, params);
  }

  transaction<T>(
    callback: (tx: DatabaseTransaction) => T,
  ): T {
    const transaction = this.db.transaction(() => {
      const tx: DatabaseTransaction = {
        run: (sql, params = []) =>
          this.run(sql, params),

        get: <R = unknown>(
          sql: string,
          params: DatabaseParams = [],
        ) => this.get<R>(sql, params),

        all: <R = unknown>(
          sql: string,
          params: DatabaseParams = [],
        ) => this.all<R>(sql, params),

        execute: (sql, params = []) =>
          this.execute(sql, params),
      };

      return callback(tx);
    });

    return transaction();
  }

  close(): void {
    if (this.db.open) {
      this.db.close();
    }
  }

  isOpen(): boolean {
    return this.db.open;
  }
}
