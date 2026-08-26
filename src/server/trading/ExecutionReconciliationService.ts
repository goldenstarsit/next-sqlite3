import type {
  ExchangeOrder,
} from "../exchanges/core/types";

import {
  OrderService,
  OrderPersistenceService,
} from "./services";

import {
  ExecutionAccountingService,
} from "./ExecutionAccountingService";

export interface ExecutionReconciliationResult {
  order: ExchangeOrder;
  persistedOrderId: number;
  accounting: ReturnType<
    ExecutionAccountingService["process"]
  >;
}

export class ExecutionReconciliationService {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderPersistence: OrderPersistenceService,
    private readonly accounting: ExecutionAccountingService,
  ) {}

  async reconcile(
    symbol: string,
    orderId: string,
  ): Promise<ExecutionReconciliationResult> {
    const order =
      await this.orderService.getOrder(
        symbol,
        orderId,
      );

    const persistedOrderId =
      this.orderPersistence.save(order);

    const accounting =
      this.accounting.process(order);

    return {
      order,
      persistedOrderId,
      accounting,
    };
  }
}
