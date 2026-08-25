import { initializeDatabase } from "../src/server/database/init";
import { getDatabase } from "../src/server/database";
import { UserRepository } from "../src/server/database/repositories/UserRepository";

initializeDatabase();

const db = getDatabase();
const users = new UserRepository(db);

const email = `test-${Date.now()}@example.com`;

const id = users.create(
  "Database Test",
  email,
);

const user = users.findById(id);

console.log("Created user:", user);

console.log(
  "All users:",
  users.findAll(),
);

console.log("Testing transaction rollback...");

const rollbackEmail =
  `rollback-${Date.now()}@example.com`;

try {
  db.transaction((tx) => {
    tx.run(
      `
        INSERT INTO users (name, email)
        VALUES (?, ?)
      `,
      ["Rollback Test", rollbackEmail],
    );

    throw new Error(
      "Intentional rollback test",
    );
  });
} catch (error) {
  if (
    error instanceof Error &&
    error.message === "Intentional rollback test"
  ) {
    console.log(
      "Transaction rolled back as expected.",
    );
  } else {
    throw error;
  }
}

const rolledBackUser = db.get(
  `
    SELECT id
    FROM users
    WHERE email = ?
  `,
  [rollbackEmail],
);

if (rolledBackUser !== undefined) {
  throw new Error(
    "Transaction rollback failed.",
  );
}

console.log(
  "Transaction test passed.",
);

console.log(
  "Database test passed.",
);
