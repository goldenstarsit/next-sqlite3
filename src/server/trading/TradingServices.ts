import type {
  Exchange,
} from "../exchanges/core/types";

import {
  BalanceService,
  MarketDataService,
  OrderService,
  OrderPersistenceService,
  PositionService,
  TradePersistenceService,
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
  TradeRepository,
} from "../database/repositories/TradeRepository";

import {
  StrategyExecutionService,
} from "./StrategyExecutionService";

import {
  ExecutionAccountingService,
} from "./ExecutionAccountingService";

import {
  ExecutionReconciliationService,
} from "./ExecutionReconciliationService";

export class TradingServices {
  readonly marketData: MarketDataService;
  readonly balance: BalanceService;
  readonly order: OrderService;
  readonly orderPersistence: OrderPersistenceService;
  readonly position: PositionService;
  readonly tradePersistence: TradePersistenceService;
  readonly accounting: ExecutionAccountingService;
  readonly reconciliation: ExecutionReconciliationService;
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

    this.tradePersistence =
      new TradePersistenceService(
        exchange,
        new TradeRepository(db),
      );

    this.accounting =
      new ExecutionAccountingService(
        this.tradePersistence,
        this.position,
      );

    this.reconciliation =
      new ExecutionReconciliationService(
        this.order,
        this.orderPersistence,
        this.accounting,
      );

    this.strategyExecution =
      new StrategyExecutionService(
        this.order,
        this.orderPersistence,
        this.reconciliation,
      );
  }
}
