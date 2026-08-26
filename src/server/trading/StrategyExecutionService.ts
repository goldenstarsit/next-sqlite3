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

export interface StrategyExecutionResult {
  order: ExchangeOrder;
  request: ExchangeOrderRequest;
  persistedOrderId?: number;
}

export class StrategyExecutionService {
  private readonly resolver: StrategyOrderResolver;

  constructor(
    private readonly orderService: OrderService,
    private readonly orderPersistence?: OrderPersistenceService,
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

    return {
      request: resolved.request,
      order,
      persistedOrderId,
    };
  }
}
