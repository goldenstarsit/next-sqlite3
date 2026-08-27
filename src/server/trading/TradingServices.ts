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

import {
  ExecutionRecoveryService,
} from "./ExecutionRecoveryService";

export class TradingServices {
  readonly marketData: MarketDataService;
  readonly balance: BalanceService;
  readonly order: OrderService;
  readonly orderPersistence: OrderPersistenceService;
  readonly position: PositionService;
  readonly tradePersistence: TradePersistenceService;
  readonly accounting: ExecutionAccountingService;
  readonly reconciliation: ExecutionReconciliationService;
  readonly recovery: ExecutionRecoveryService;
  readonly strategyExecution: StrategyExecutionService;

  private started = false;

  private lastRecoveryResult:
    Awaited<
      ReturnType<
        ExecutionRecoveryService["recover"]
      >
    > | undefined;

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
        db,
        exchange.id,
      );

    this.reconciliation =
      new ExecutionReconciliationService(
        this.order,
        this.orderPersistence,
        this.accounting,
      );

    this.recovery =
      new ExecutionRecoveryService(
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

  /**
   * Starts the trading service lifecycle.
   *
   * Database initialization and service construction happen
   * synchronously in the constructor. Exchange-dependent
   * recovery is deliberately asynchronous and therefore belongs
   * here rather than inside the constructor.
   *
   * Calling start() more than once is safe.
   */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.lastRecoveryResult =
      await this.recovery.recover();

    this.started = true;
  }

  isStarted(): boolean {
    return this.started;
  }

  getLastRecoveryResult() {
    return this.lastRecoveryResult;
  }
}
