import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from "../exchanges/core/types";

import type {
  StrategyOrder,
} from "../strategies/core/types";

import {
  StrategyOrderResolver,
  type StrategyExecutionBalances,
} from "./StrategyOrderResolver";

import {
  OrderService,
  OrderPersistenceService,
} from "./services";

import {
  ExecutionReconciliationService,
} from "./ExecutionReconciliationService";

export interface StrategyExecutionResult {
  order: ExchangeOrder;
  request: ExchangeOrderRequest;
  persistedOrderId?: number;
  reconciliation?: Awaited<
    ReturnType<ExecutionReconciliationService["reconcile"]>
  >;
}

export class StrategyExecutionService {
  private readonly resolver: StrategyOrderResolver;

  constructor(
    private readonly orderService: OrderService,
    private readonly orderPersistence?: OrderPersistenceService,
    private readonly reconciliation?: ExecutionReconciliationService,
  ) {
    this.resolver =
      new StrategyOrderResolver(
        orderService.getExchange(),
      );
  }

  async execute(
    strategyOrder: StrategyOrder,
    balances?: StrategyExecutionBalances,
  ): Promise<StrategyExecutionResult> {
    const resolved =
      await this.resolver.resolve(
        strategyOrder,
        balances,
      );

    const order =
      await this.orderService.createOrder(
        resolved.request,
      );

    const persistedOrderId =
      this.orderPersistence
        ? this.orderPersistence.save(order)
        : undefined;

    /*
     * Reconcile immediately after submission.
     *
     * The exchange response may already contain a
     * partial/full execution. Reconciliation fetches
     * the latest cumulative exchange state and lets
     * ExecutionAccountingService record only the
     * newly executed quantity.
     */
    const reconciliation =
      this.reconciliation
        ? await this.reconciliation.reconcile(
            order.symbol,
            order.orderId,
          )
        : undefined;

    return {
      request: resolved.request,
      order,
      persistedOrderId,
      reconciliation,
    };
  }
}
