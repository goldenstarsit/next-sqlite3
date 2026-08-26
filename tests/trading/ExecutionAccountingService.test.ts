import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  SQLiteDatabase,
} from "../../src/server/database/adapters/sqlite/SQLiteDatabase";

import {
  runMigrations,
} from "../../src/server/database/migrations/runner";

import {
  initialMigration,
} from "../../src/server/database/migrations/001_initial";

import {
  exchangeConfigsMigration,
} from "../../src/server/database/migrations/002_exchange_configs";

import {
  tradingMigration,
} from "../../src/server/database/migrations/003_trading";

import type {
  ExchangeOrder,
} from "../../src/server/exchanges/core/types";

import {
  ExecutionAccountingService,
} from "../../src/server/trading/ExecutionAccountingService";

function createDatabase() {
  const db = new SQLiteDatabase(":memory:");

  runMigrations(db, [
    initialMigration,
    exchangeConfigsMigration,
    tradingMigration,
  ]);

  return db;
}

function createOrder(
  overrides: Partial<ExchangeOrder> = {},
): ExchangeOrder {
  return {
    symbol: "BTCUSDT",
    orderId: "1001",
    side: "BUY",
    type: "MARKET",
    status: "FILLED",
    price: 100,
    originalQuantity: 1,
    executedQuantity: 1,
    transactTime: 1000,
    ...overrides,
  };
}

describe(
  "ExecutionAccountingService",
  () => {
    let db: SQLiteDatabase;

    afterEach(() => {
      db?.close();
    });

    it(
      "records a filled BUY and opens a position",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const result =
          service.process(
            createOrder(),
          );

        expect(result.action)
          .toBe("POSITION_OPENED");

        expect(result.tradeId)
          .toBe(1);

        expect(result.positionId)
          .toBe(1);

        const trades =
          db.all<any>(
            `
              SELECT *
              FROM trades
            `,
          );

        const positions =
          db.all<any>(
            `
              SELECT *
              FROM positions
            `,
          );

        expect(trades)
          .toHaveLength(1);

        expect(positions)
          .toHaveLength(1);

        expect(
          positions[0].entry_price,
        ).toBe(100);

        expect(
          positions[0].quantity,
        ).toBe(1);
      },
    );

    it(
      "does not duplicate an already persisted order",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const order =
          createOrder();

        const first =
          service.process(order);

        const second =
          service.process(order);

        expect(first.action)
          .toBe("POSITION_OPENED");

        expect(second.action)
          .toBe("TRADE_RECORDED");

        const trades =
          db.all<any>(
            `
              SELECT *
              FROM trades
            `,
          );

        const positions =
          db.all<any>(
            `
              SELECT *
              FROM positions
            `,
          );

        expect(trades)
          .toHaveLength(1);

        expect(positions)
          .toHaveLength(1);
      },
    );

    it(
      "ignores orders without execution",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const result =
          service.process(
            createOrder({
              status: "NEW",
              executedQuantity: 0,
            }),
          );

        expect(result.action)
          .toBe("IGNORED");

        expect(
          db.all(
            `SELECT * FROM trades`,
          ),
        ).toHaveLength(0);

        expect(
          db.all(
            `SELECT * FROM positions`,
          ),
        ).toHaveLength(0);
      },
    );

    it(
      "closes a position on a filled SELL and calculates realized PnL",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        service.process(
          createOrder({
            orderId: "buy-1",
            side: "BUY",
            price: 100,
          }),
        );

        const result =
          service.process(
            createOrder({
              orderId: "sell-1",
              side: "SELL",
              price: 110,
            }),
          );

        expect(result.action)
          .toBe("POSITION_CLOSED");

        expect(result.realizedPnl)
          .toBe(10);

        const position =
          db.get<any>(
            `
              SELECT *
              FROM positions
              WHERE id = 1
            `,
          );

        expect(position.status)
          .toBe("CLOSED");

        expect(position.realized_pnl)
          .toBe(10);
      },
    );

    it(
      "records a SELL when there is no open position",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const result =
          service.process(
            createOrder({
              orderId: "sell-1",
              side: "SELL",
              price: 110,
            }),
          );

        expect(result.action)
          .toBe("TRADE_RECORDED");

        expect(
          db.all(
            `SELECT * FROM trades`,
          ),
        ).toHaveLength(1);

        expect(
          db.all(
            `SELECT * FROM positions`,
          ),
        ).toHaveLength(0);
      },
    );
  },
);
