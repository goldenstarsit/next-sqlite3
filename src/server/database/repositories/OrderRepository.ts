import type { Database } from "../core/types";
import type {
  ExchangeOrder,
} from "../../exchanges/core/types";

export interface StoredOrder {
  id: number;
  exchange: string;
  symbol: string;
  order_id: string;
  client_order_id?: string;
  side: string;
  type: string;
  status: string;
  price: number;
  original_quantity: number;
  executed_quantity: number;
  transact_time?: number;
  created_at: string;
  updated_at: string;
}

export class OrderRepository {
  constructor(
    private readonly db: Database,
  ) {}

  save(
    exchange: string,
    order: ExchangeOrder,
  ): number {
    const existing = this.findByExchangeOrderId(
      exchange,
      order.orderId,
    );

    if (existing) {
      this.db.run(
        `
          UPDATE orders
          SET
            client_order_id = ?,
            side = ?,
            type = ?,
            status = ?,
            price = ?,
            original_quantity = ?,
            executed_quantity = ?,
            transact_time = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          order.clientOrderId ?? null,
          order.side,
          order.type,
          order.status,
          order.price,
          order.originalQuantity,
          order.executedQuantity,
          order.transactTime ?? null,
          existing.id,
        ],
      );

      return existing.id;
    }

    const result = this.db.run(
      `
        INSERT INTO orders (
          exchange,
          symbol,
          order_id,
          client_order_id,
          side,
          type,
          status,
          price,
          original_quantity,
          executed_quantity,
          transact_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        exchange,
        order.symbol,
        order.orderId,
        order.clientOrderId ?? null,
        order.side,
        order.type,
        order.status,
        order.price,
        order.originalQuantity,
        order.executedQuantity,
        order.transactTime ?? null,
      ],
    );

    return Number(result.lastInsertId);
  }

  findById(
    id: number,
  ): StoredOrder | undefined {
    return this.db.get<StoredOrder>(
      `
        SELECT *
        FROM orders
        WHERE id = ?
      `,
      [id],
    );
  }

  findByExchangeOrderId(
    exchange: string,
    orderId: string,
  ): StoredOrder | undefined {
    return this.db.get<StoredOrder>(
      `
        SELECT *
        FROM orders
        WHERE exchange = ?
          AND order_id = ?
      `,
      [exchange, orderId],
    );
  }

  findBySymbol(
    symbol: string,
  ): StoredOrder[] {
    return this.db.all<StoredOrder>(
      `
        SELECT *
        FROM orders
        WHERE symbol = ?
        ORDER BY id DESC
      `,
      [symbol],
    );
  }

  findRecoveryCandidates(): StoredOrder[] {
    return this.db.all<StoredOrder>(
      `
        SELECT o.*
        FROM orders o
        WHERE
          o.status IN (
            'NEW',
            'PARTIALLY_FILLED',
            'FILLED',
            'CANCELED',
            'EXPIRED'
          )
          AND (
            o.status IN (
              'NEW',
              'PARTIALLY_FILLED'
            )
            OR o.executed_quantity > (
              SELECT COALESCE(
                SUM(t.quantity),
                0
              )
              FROM trades t
              WHERE t.exchange = o.exchange
                AND t.order_id = o.order_id
            )
          )
        ORDER BY o.id ASC
      `,
    );
  }

  findAll(): StoredOrder[] {
    return this.db.all<StoredOrder>(
      `
        SELECT *
        FROM orders
        ORDER BY id DESC
      `,
    );
  }
}
