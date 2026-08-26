import { describe, expect, it } from "vitest";

import { SQLiteDatabase } from "../../src/server/database/adapters/sqlite/SQLiteDatabase";
import { initialMigration } from "../../src/server/database/migrations/001_initial";
import { UserRepository } from "../../src/server/database/repositories/UserRepository";

function createTestDatabase(): SQLiteDatabase {
  const db = new SQLiteDatabase(":memory:");

  initialMigration.up(db);

  return db;
}

describe("UserRepository", () => {
  it("creates and finds a user by id", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    const id = repository.create(
      "Alice",
      "alice@example.com",
    );

    expect(id).toBe(1);

    expect(repository.findById(id)).toMatchObject({
      id: 1,
      name: "Alice",
      email: "alice@example.com",
    });

    db.close();
  });

  it("returns undefined for an unknown user", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    expect(repository.findById(999)).toBeUndefined();

    db.close();
  });

  it("returns users ordered by newest id first", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    repository.create(
      "Alice",
      "alice@example.com",
    );

    repository.create(
      "Bob",
      "bob@example.com",
    );

    repository.create(
      "Charlie",
      "charlie@example.com",
    );

    expect(repository.findAll()).toMatchObject([
      {
        id: 3,
        name: "Charlie",
        email: "charlie@example.com",
      },
      {
        id: 2,
        name: "Bob",
        email: "bob@example.com",
      },
      {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
      },
    ]);

    db.close();
  });

  it("returns an empty array when no users exist", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    expect(repository.findAll()).toEqual([]);

    db.close();
  });

  it("rejects duplicate email addresses", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    repository.create(
      "Alice",
      "alice@example.com",
    );

    expect(() =>
      repository.create(
        "Another Alice",
        "alice@example.com",
      ),
    ).toThrow();

    expect(repository.findAll()).toHaveLength(1);

    db.close();
  });

  it("preserves database-generated created_at values", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    const id = repository.create(
      "Alice",
      "alice@example.com",
    );

    const user = repository.findById(id);

    expect(user).toBeDefined();
    expect(user?.created_at).toEqual(
      expect.any(String),
    );
    expect(user?.created_at.length).toBeGreaterThan(0);

    db.close();
  });

  it("supports repository operations inside a transaction", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    db.transaction(() => {
      repository.create(
        "Alice",
        "alice@example.com",
      );

      repository.create(
        "Bob",
        "bob@example.com",
      );
    });

    expect(repository.findAll()).toHaveLength(2);

    db.close();
  });

  it("rolls back repository writes when the transaction fails", () => {
    const db = createTestDatabase();
    const repository = new UserRepository(db);

    expect(() => {
      db.transaction(() => {
        repository.create(
          "Alice",
          "alice@example.com",
        );

        throw new Error("transaction failed");
      });
    }).toThrow("transaction failed");

    expect(repository.findAll()).toEqual([]);

    db.close();
  });
});
