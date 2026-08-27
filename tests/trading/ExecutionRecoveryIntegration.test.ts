import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  SQLiteDatabase,
} from "../../src/server/database/adapters/sqlite/SQLiteDatabase";

import {
  tradingMigration,
} from "../../src/server/database/migrations/003_trading";

import {
  OrderRepository,
} from "../../src/server/database/repositories/OrderRepository";

import {
  TradeRepository,
} from "../../src/server/database/repositories/TradeRepository";

import {
  OrderPersistenceService,
} from "../../src/server/trading/services/OrderPersistenceService";

import {
  ExecutionAccountingService,
} from "../../src/server/trading/ExecutionAccountingService";

import {
  ExecutionRecoveryService,
} from "../../src/server/trading/ExecutionRecoveryService";

describe(
  "ExecutionRecoveryService integration",
  () => {
    let db: SQLiteDatabase;

    afterEach(() => {
      db.close();
    });

    it(
      "recovers an unaccounted execution and remains idempotent",
      async () => {
        db = new SQLiteDatabase(":memory:");
        tradingMigration.up(db);

        const exchange = {
          id: "test",

          getOrder:
            vi.fn().mockResolvedValue({
              symbol: "BTCUSDT",
              orderId: "order-1",
              side: "BUY",
              type: "MARKET",
              status: "FILLED",
              price: 100,
              originalQuantity: 2,
              executedQuantity: 2,
              transactTime: 2000,
            }),
        } as any;

        const orderRepository =
          new OrderRepository(db);

        const orderPersistence =
          new OrderPersistenceService(
            exchange,
            orderRepository,
          );

        const accounting =
          new ExecutionAccountingService(
            db,
            "test",
          );

        const recovery =
          new ExecutionRecoveryService(
            orderPersistence,
            accounting,
          );

        orderRepository.save(
          "test",
          {
            symbol: "BTCUSDT",
            orderId: "order-1",
            side: "BUY",
            type: "MARKET",
            status: "NEW",
            price: 100,
            originalQuantity: 2,
            executedQuantity: 0,
            transactTime: 1000,
          } as any,
        );

        const first =
          await recovery.recover();

        expect(first.attempted)
          .toBe(1);

        expect(first.recovered)
          .toBe(1);

        expect(
          new TradeRepository(db)
            .findByOrderId(
              "test",
              "order-1",
            ),
        ).toHaveLength(1);

        expect(
          db.get<{ quantity: number }>(
            `
              SELECT quantity
              FROM positions
              WHERE exchange = ?
                AND symbol = ?
                AND status = 'OPEN'
            `,
            ["test", "BTCUSDT"],
          ),
        ).toEqual({
          quantity: 2,
        });

        const second =
          await recovery.recover();

        expect(second.attempted)
          .toBe(0);

        expect(second.recovered)
          .toBe(0);

        expect(
          new TradeRepository(db)
            .findByOrderId(
              "test",
              "order-1",
            ),
        ).toHaveLength(1);

        expect(
          exchange.getOrder,
        ).toHaveBeenCalledTimes(1);
      },
    );
  },
);
