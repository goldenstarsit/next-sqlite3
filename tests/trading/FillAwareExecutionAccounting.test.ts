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

function order(
  overrides: Partial<ExchangeOrder> = {},
): ExchangeOrder {
  return {
    symbol: "BTCUSDT",
    orderId: "order-1",
    side: "BUY",
    type: "LIMIT",
    status: "PARTIALLY_FILLED",
    price: 100,
    originalQuantity: 2,
    executedQuantity: 1,
    transactTime: 1000,
    ...overrides,
  };
}

describe(
  "Fill-aware execution accounting",
  () => {
    let db: SQLiteDatabase;

    afterEach(() => {
      db?.close();
    });

    it(
      "records only the newly executed quantity",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const first =
          service.process(
            order({
              executedQuantity: 1,
            }),
          );

        const second =
          service.process(
            order({
              executedQuantity: 1.5,
            }),
          );

        expect(first.executedQuantity)
          .toBe(1);

        expect(second.executedQuantity)
          .toBe(0.5);

        const trades =
          db.all<any>(
            `
              SELECT *
              FROM trades
              ORDER BY id ASC
            `,
          );

        const position =
          db.get<any>(
            `
              SELECT *
              FROM positions
              WHERE exchange = ?
                AND symbol = ?
                AND status = 'OPEN'
            `,
            ["test", "BTCUSDT"],
          );

        expect(trades)
          .toHaveLength(2);

        expect(trades[0].quantity)
          .toBe(1);

        expect(trades[1].quantity)
          .toBe(0.5);

        expect(position.quantity)
          .toBe(1.5);
      },
    );

    it(
      "does not process the same cumulative execution twice",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const o =
          order({
            executedQuantity: 1,
          });

        service.process(o);

        const second =
          service.process(o);

        expect(second.action)
          .toBe("TRADE_RECORDED");

        expect(
          db.all(
            `SELECT * FROM trades`,
          ),
        ).toHaveLength(1);

        const position =
          db.get<any>(
            `
              SELECT *
              FROM positions
              WHERE exchange = ?
                AND symbol = ?
                AND status = 'OPEN'
            `,
            ["test", "BTCUSDT"],
          );

        expect(position.quantity)
          .toBe(1);
      },
    );

    it(
      "reduces a position on partial SELL",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        service.process(
          order({
            orderId: "buy",
            side: "BUY",
            status: "FILLED",
            executedQuantity: 2,
            price: 100,
          }),
        );

        const result =
          service.process(
            order({
              orderId: "sell",
              side: "SELL",
              status: "PARTIALLY_FILLED",
              executedQuantity: 0.5,
              price: 110,
            }),
          );

        expect(result.action)
          .toBe("POSITION_REDUCED");

        expect(result.realizedPnl)
          .toBe(5);

        const position =
          db.get<any>(
            `
              SELECT *
              FROM positions
              WHERE id = 1
            `,
          );

        expect(position.quantity)
          .toBe(1.5);

        expect(position.status)
          .toBe("OPEN");

        expect(position.realized_pnl)
          .toBe(5);
      },
    );

    it(
      "closes the remaining position on final SELL",
      () => {
        db = createDatabase();

        const service =
          new ExecutionAccountingService(
            db,
            "test",
          );

        service.process(
          order({
            orderId: "buy",
            side: "BUY",
            status: "FILLED",
            executedQuantity: 2,
            price: 100,
          }),
        );

        service.process(
          order({
            orderId: "sell",
            side: "SELL",
            status: "PARTIALLY_FILLED",
            executedQuantity: 1,
            price: 110,
          }),
        );

        const result =
          service.process(
            order({
              orderId: "sell",
              side: "SELL",
              status: "FILLED",
              executedQuantity: 2,
              price: 110,
            }),
          );

        expect(result.action)
          .toBe("POSITION_CLOSED");

        expect(result.executedQuantity)
          .toBe(1);

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

        expect(position.quantity)
          .toBe(0);

        expect(position.realized_pnl)
          .toBe(20);
      },
    );
  },
);
