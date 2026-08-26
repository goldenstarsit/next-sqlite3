import type { Exchange } from "../../exchanges/core/types";

import {
  PositionRepository,
} from "../../database/repositories/PositionRepository";

export class PositionService {
  constructor(
    private readonly exchange: Exchange,
    private readonly repository: PositionRepository,
  ) {}

  open(
    symbol: string,
    side: string,
    quantity: number,
    entryPrice: number,
  ): number {
    return this.repository.create({
      exchange: this.exchange.id,
      symbol,
      side,
      quantity,
      entryPrice,
    });
  }

  getOpen(
    symbol: string,
  ) {
    return this.repository.findOpen(
      this.exchange.id,
      symbol,
    );
  }

  getAllOpen() {
    return this.repository.findAllOpen();
  }

  increaseQuantity(
    id: number,
    additionalQuantity: number,
    executionPrice: number,
  ): void {
    this.repository.increaseQuantity(
      id,
      additionalQuantity,
      executionPrice,
    );
  }

  reduceQuantity(
    id: number,
    quantity: number,
    realizedPnl: number,
  ): void {
    this.repository.reduceQuantity(
      id,
      quantity,
      realizedPnl,
    );
  }

  updateMarketValue(
    id: number,
    currentPrice: number,
    unrealizedPnl: number,
  ): void {
    this.repository.updateMarketValue(
      id,
      currentPrice,
      unrealizedPnl,
    );
  }

  close(
    id: number,
    realizedPnl: number,
  ): void {
    this.repository.close(
      id,
      realizedPnl,
    );
  }

  getAll() {
    return this.repository.findAll();
  }
}
