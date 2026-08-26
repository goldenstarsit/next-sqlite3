import type { Database } from "../core/types";

export interface StoredTrade {
  id: number;
  exchange: string;
  symbol: string;
  order_id: string;
  side: string;
  quantity: number;
  price: number;
  quote_quantity: number;
  fee: number;
  fee_asset?: string;
  realized_pnl?: number;
  executed_at?: number;
  created_at: string;
}

export interface CreateTradeInput {
  exchange: string;
  symbol: string;
  orderId: string;
  side: string;
  quantity: number;
  price: number;
  quoteQuantity: number;
  fee?: number;
  feeAsset?: string;
  realizedPnl?: number;
  executedAt?: number;
}

export class TradeRepository {
  constructor(
    private readonly db: Database,
  ) {}

  create(
    input: CreateTradeInput,
  ): number {
    const result = this.db.run(
      `
        INSERT INTO trades (
          exchange,
          symbol,
          order_id,
          side,
          quantity,
          price,
          quote_quantity,
          fee,
          fee_asset,
          realized_pnl,
          executed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.exchange,
        input.symbol,
        input.orderId,
        input.side,
        input.quantity,
        input.price,
        input.quoteQuantity,
        input.fee ?? 0,
        input.feeAsset ?? null,
        input.realizedPnl ?? null,
        input.executedAt ?? null,
      ],
    );

    return Number(result.lastInsertId);
  }

  findBySymbol(
    symbol: string,
  ): StoredTrade[] {
    return this.db.all<StoredTrade>(
      `
        SELECT *
        FROM trades
        WHERE symbol = ?
        ORDER BY id DESC
      `,
      [symbol],
    );
  }

  findByOrderId(
    exchange: string,
    orderId: string,
  ): StoredTrade[] {
    return this.db.all<StoredTrade>(
      `
        SELECT *
        FROM trades
        WHERE exchange = ?
          AND order_id = ?
        ORDER BY id DESC
      `,
      [exchange, orderId],
    );
  }

  findAll(): StoredTrade[] {
    return this.db.all<StoredTrade>(
      `
        SELECT *
        FROM trades
        ORDER BY id DESC
      `,
    );
  }
}
