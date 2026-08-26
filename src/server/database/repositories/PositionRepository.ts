import type { Database } from "../core/types";

export type PositionStatus = "OPEN" | "CLOSED";

export interface StoredPosition {
  id: number;
  exchange: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  current_price?: number;
  realized_pnl: number;
  unrealized_pnl: number;
  status: PositionStatus;
  opened_at: string;
  closed_at?: string;
  updated_at: string;
}

export interface CreatePositionInput {
  exchange: string;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
}

export class PositionRepository {
  constructor(
    private readonly db: Database,
  ) {}

  create(
    input: CreatePositionInput,
  ): number {
    const result = this.db.run(
      `
        INSERT INTO positions (
          exchange,
          symbol,
          side,
          quantity,
          entry_price
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        input.exchange,
        input.symbol,
        input.side,
        input.quantity,
        input.entryPrice,
      ],
    );

    return Number(result.lastInsertId);
  }

  findOpen(
    exchange: string,
    symbol: string,
  ): StoredPosition | undefined {
    return this.db.get<StoredPosition>(
      `
        SELECT *
        FROM positions
        WHERE exchange = ?
          AND symbol = ?
          AND status = 'OPEN'
      `,
      [exchange, symbol],
    );
  }

  findAllOpen(): StoredPosition[] {
    return this.db.all<StoredPosition>(
      `
        SELECT *
        FROM positions
        WHERE status = 'OPEN'
        ORDER BY id DESC
      `,
    );
  }

  updateMarketValue(
    id: number,
    currentPrice: number,
    unrealizedPnl: number,
  ): void {
    this.db.run(
      `
        UPDATE positions
        SET
          current_price = ?,
          unrealized_pnl = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        currentPrice,
        unrealizedPnl,
        id,
      ],
    );
  }

  close(
    id: number,
    realizedPnl: number,
  ): void {
    this.db.run(
      `
        UPDATE positions
        SET
          status = 'CLOSED',
          realized_pnl = ?,
          closed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        realizedPnl,
        id,
      ],
    );
  }

  findAll(): StoredPosition[] {
    return this.db.all<StoredPosition>(
      `
        SELECT *
        FROM positions
        ORDER BY id DESC
      `,
    );
  }
}
