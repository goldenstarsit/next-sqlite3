import type {
  Exchange,
} from "../exchanges/core/types";

import {
  BalanceService,
  MarketDataService,
  OrderService,
} from "./services";

import {
  StrategyExecutionService,
} from "./StrategyExecutionService";

export class TradingServices {
  readonly marketData: MarketDataService;
  readonly balance: BalanceService;
  readonly order: OrderService;
  readonly strategyExecution: StrategyExecutionService;

  constructor(
    exchange: Exchange,
  ) {
    this.marketData =
      new MarketDataService(exchange);

    this.balance =
      new BalanceService(exchange);

    this.order =
      new OrderService(exchange);

    this.strategyExecution =
      new StrategyExecutionService(
        this.order,
      );
  }
}
