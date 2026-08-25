import { createDatabase } from "./factory";

import type {
  Database,
  DatabaseExecutor,
  DatabaseParams,
  DatabaseResult,
  DatabaseTransaction,
} from "./core/types";

const globalForDatabase = globalThis as unknown as {
  database?: Database;
};

export function getDatabase(): Database {
  if (!globalForDatabase.database) {
    globalForDatabase.database = createDatabase();
  }

  return globalForDatabase.database;
}

export type {
  Database,
  DatabaseExecutor,
  DatabaseParams,
  DatabaseResult,
  DatabaseTransaction,
};
