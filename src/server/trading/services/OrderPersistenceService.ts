import type {
  Exchange,
  ExchangeOrder,
} from "../../exchanges/core/types";

import {
  OrderRepository,
} from "../../database/repositories/OrderRepository";

export class OrderPersistenceService {
  constructor(
    private readonly exchange: Exchange,
    private readonly repository: OrderRepository,
  ) {}

  save(
    order: ExchangeOrder,
  ): number {
    return this.repository.save(
      this.exchange.id,
      order,
    );
  }

  findByExchangeOrderId(
    orderId: string,
  ) {
    return this.repository.findByExchangeOrderId(
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

  findRecoveryCandidates() {
    return this.repository.findRecoveryCandidates();
  }

  async getExchangeOrder(
    symbol: string,
    orderId: string,
  ) {
    return this.exchange.getOrder(
      symbol,
      orderId,
    );
  }
}
