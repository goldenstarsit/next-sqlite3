import type { Database } from "../core/types";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface UserRepositoryContract {
  create(
    name: string,
    email: string,
  ): number;

  findById(
    id: number,
  ): User | undefined;

  findAll(): User[];
}

export class UserRepository
  implements UserRepositoryContract
{
  constructor(
    private readonly db: Database,
  ) {}

  create(
    name: string,
    email: string,
  ): number {
    const result = this.db.run(
      `
        INSERT INTO users (
          name,
          email
        )
        VALUES (?, ?)
      `,
      [name, email],
    );

    return Number(result.lastInsertId);
  }

  findById(
    id: number,
  ): User | undefined {
    return this.db.get<User>(
      `
        SELECT
          id,
          name,
          email,
          created_at
        FROM users
        WHERE id = ?
      `,
      [id],
    );
  }

  findAll(): User[] {
    return this.db.all<User>(
      `
        SELECT
          id,
          name,
          email,
          created_at
        FROM users
        ORDER BY id DESC
      `,
    );
  }
}
