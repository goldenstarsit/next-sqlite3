import { getDatabase } from "./index";
import { runMigrations } from "./migrations/runner";
import { initialMigration } from "./migrations/001_initial";

let initialized = false;

export function initializeDatabase(): void {
  if (initialized) {
    return;
  }

  const db = getDatabase();

  runMigrations(db, [
    initialMigration,
  ]);

  initialized = true;
}
