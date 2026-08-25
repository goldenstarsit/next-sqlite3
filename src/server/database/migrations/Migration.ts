import type { Database } from "../core/types";

export interface Migration {
  version: number;
  name: string;
  up(db: Database): void;
}
