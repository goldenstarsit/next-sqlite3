export type DatabaseValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | Uint8Array;

export type DatabaseParams = DatabaseValue[];

export interface DatabaseResult {
  changes: number;
  lastInsertId: number | bigint;
}

/**
 * Operations available to repositories and transactions.
 *
 * This is deliberately independent of SQLite, PostgreSQL, MySQL, etc.
 */
export interface DatabaseExecutor {
  run(
    sql: string,
    params?: DatabaseParams,
  ): DatabaseResult;

  get<T = unknown>(
    sql: string,
    params?: DatabaseParams,
  ): T | undefined;

  all<T = unknown>(
    sql: string,
    params?: DatabaseParams,
  ): T[];

  execute(
    sql: string,
    params?: DatabaseParams,
  ): DatabaseResult;
}

export interface DatabaseTransaction extends DatabaseExecutor {}

export interface Database extends DatabaseExecutor {
  transaction<T>(
    callback: (tx: DatabaseTransaction) => T,
  ): T;

  close(): void;

  isOpen(): boolean;
}
