import type { Exchange } from "../../exchanges/core/types";

import {
  TradeRepository,
  type CreateTradeInput,
} from "../../database/repositories/TradeRepository";

export interface PersistExecutionInput {
  symbol: string;
  orderId: string;
  side: string;
  quantity: number;
  price: number;
  quoteQuantity?: number;
  fee?: number;
  feeAsset?: string;
  realizedPnl?: number;
  executedAt?: number;
}

export class TradePersistenceService {
  constructor(
    private readonly exchange: Exchange,
    private readonly repository: TradeRepository,
  ) {}

  persist(
    input: PersistExecutionInput,
  ): number {
    if (
      !Number.isFinite(input.quantity) ||
      input.quantity <= 0
    ) {
      throw new Error(
        "Trade quantity must be greater than zero",
      );
    }

    if (
      !Number.isFinite(input.price) ||
      input.price <= 0
    ) {
      throw new Error(
        "Trade price must be greater than zero",
      );
    }

    const trade: CreateTradeInput = {
      exchange: this.exchange.id,
      symbol: input.symbol,
      orderId: input.orderId,
      side: input.side,
      quantity: input.quantity,
      price: input.price,
      quoteQuantity:
        input.quoteQuantity ??
        input.quantity * input.price,
      fee: input.fee ?? 0,
      feeAsset: input.feeAsset,
      realizedPnl: input.realizedPnl,
      executedAt: input.executedAt,
    };

    /*
     * ExecutionAccountingService is responsible for
     * calculating the newly executed quantity from the
     * cumulative exchange order state.
     *
     * Therefore multiple trade/fill records may belong
     * to the same exchange order.
     *
     * Do NOT perform order-level idempotency here.
     * Repeated cumulative order updates are filtered
     * before this method is called.
     */
    return this.repository.create(trade);
  }

  findByOrderId(
    orderId: string,
  ) {
    return this.repository.findByOrderId(
      this.exchange.id,
      orderId,
    );
  }

  findBySymbol(
    symbol: string,
  ) {
    return this.repository.findBySymbol(symbol);
  }

  findAll() {
    return this.repository.findAll();
  }
}
