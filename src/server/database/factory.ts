import type { Database } from "./core/types";
import { SQLiteDatabase } from "./adapters/sqlite/SQLiteDatabase";

const driver = process.env.DATABASE_DRIVER ?? "sqlite";

const sqlitePath =
  process.env.SQLITE_DATABASE_PATH ?? "./data/tradingbot.db";

export function createDatabase(): Database {
  switch (driver) {
    case "sqlite":
      return new SQLiteDatabase(sqlitePath);

    case "postgres":
      throw new Error(
        "PostgreSQL database driver is not implemented yet.",
      );

    case "mysql":
      throw new Error(
        "MySQL database driver is not implemented yet.",
      );

    default:
      throw new Error(
        `Unsupported database driver: ${driver}`,
      );
  }
}
