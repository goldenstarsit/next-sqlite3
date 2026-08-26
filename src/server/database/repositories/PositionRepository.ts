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

  increaseQuantity(
    id: number,
    additionalQuantity: number,
    executionPrice: number,
  ): void {
    const position = this.db.get<StoredPosition>(
      `
        SELECT *
        FROM positions
        WHERE id = ?
          AND status = 'OPEN'
      `,
      [id],
    );

    if (!position) {
      throw new Error(
        `Open position not found: ${id}`,
      );
    }

    if (
      !Number.isFinite(additionalQuantity) ||
      additionalQuantity <= 0
    ) {
      throw new Error(
        "Additional position quantity must be greater than zero",
      );
    }

    if (
      !Number.isFinite(executionPrice) ||
      executionPrice <= 0
    ) {
      throw new Error(
        "Execution price must be greater than zero",
      );
    }

    const totalQuantity =
      position.quantity + additionalQuantity;

    const weightedEntry =
      (
        position.quantity * position.entry_price +
        additionalQuantity * executionPrice
      ) / totalQuantity;

    this.db.run(
      `
        UPDATE positions
        SET
          quantity = ?,
          entry_price = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'OPEN'
      `,
      [
        totalQuantity,
        weightedEntry,
        id,
      ],
    );
  }

  reduceQuantity(
    id: number,
    quantity: number,
    realizedPnl: number,
  ): void {
    const position = this.db.get<StoredPosition>(
      `
        SELECT *
        FROM positions
        WHERE id = ?
          AND status = 'OPEN'
      `,
      [id],
    );

    if (!position) {
      throw new Error(
        `Open position not found: ${id}`,
      );
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        "Reduced position quantity must be greater than zero",
      );
    }

    if (quantity > position.quantity) {
      throw new Error(
        `Cannot reduce ${quantity}; position quantity is ${position.quantity}`,
      );
    }

    const remainingQuantity =
      position.quantity - quantity;

    const accumulatedRealizedPnl =
      position.realized_pnl + realizedPnl;

    if (remainingQuantity <= 1e-12) {
      this.close(
        id,
        accumulatedRealizedPnl,
      );

      return;
    }

    this.db.run(
      `
        UPDATE positions
        SET
          quantity = ?,
          realized_pnl = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'OPEN'
      `,
      [
        remainingQuantity,
        accumulatedRealizedPnl,
        id,
      ],
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
