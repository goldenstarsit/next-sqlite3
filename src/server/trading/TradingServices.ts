import type {
  Exchange,
} from "../exchanges/core/types";

import {
  BalanceService,
  MarketDataService,
  OrderService,
  OrderPersistenceService,
  PositionService,
} from "./services";

import {
  getDatabase,
} from "../database";


import {
  initializeDatabase,
} from "../database/init";

import {
  OrderRepository,
} from "../database/repositories/OrderRepository";

import {
  PositionRepository,
} from "../database/repositories/PositionRepository";

import {
  StrategyExecutionService,
} from "./StrategyExecutionService";

export class TradingServices {
  readonly marketData: MarketDataService;
  readonly balance: BalanceService;
  readonly order: OrderService;
  readonly orderPersistence: OrderPersistenceService;
  readonly position: PositionService;
  readonly strategyExecution: StrategyExecutionService;

  constructor(
    exchange: Exchange,
  ) {
    initializeDatabase();
    this.marketData =
      new MarketDataService(exchange);

    this.balance =
      new BalanceService(exchange);

    this.order =
      new OrderService(exchange);

    const db = getDatabase();

    this.orderPersistence =
      new OrderPersistenceService(
        exchange,
        new OrderRepository(db),
      );

    this.position =
      new PositionService(
        exchange,
        new PositionRepository(db),
      );

    this.strategyExecution =
      new StrategyExecutionService(
        this.order,
        this.orderPersistence,
      );
  }
}
