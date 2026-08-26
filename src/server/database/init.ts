import { getDatabase } from "./index";
import { runMigrations } from "./migrations/runner";
import { initialMigration } from "./migrations/001_initial";
import { exchangeConfigsMigration } from "./migrations/002_exchange_configs";
import { tradingMigration } from "./migrations/003_trading";

export function initializeDatabase(): void {
  const db = getDatabase();

  runMigrations(db, [
    initialMigration,
    exchangeConfigsMigration,
    tradingMigration,
  ]);
}
