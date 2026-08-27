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
  tradingMigration,
} from "../../src/server/database/migrations/003_trading";

import {
  OrderRepository,
} from "../../src/server/database/repositories/OrderRepository";

import {
  TradeRepository,
} from "../../src/server/database/repositories/TradeRepository";

function createDatabase() {
  const db = new SQLiteDatabase(":memory:");

  tradingMigration.up(db);

  return db;
}

function createOrder(
  overrides: Record<string, unknown> = {},
) {
  return {
    symbol: "BTCUSDT",
    orderId: "order-1",
    clientOrderId: undefined,
    side: "BUY",
    type: "MARKET",
    status: "FILLED",
    price: 100,
    originalQuantity: 2,
    executedQuantity: 2,
    transactTime: 1000,
    ...overrides,
  } as any;
}

describe(
  "OrderRepository recovery candidates",
  () => {
    let db: SQLiteDatabase;

    afterEach(() => {
      db.close();
    });

    it(
      "returns NEW orders as recovery candidates",
      () => {
        db = createDatabase();

        const repository =
          new OrderRepository(db);

        repository.save(
          "test",
          createOrder({
            status: "NEW",
            executedQuantity: 0,
          }),
        );

        const candidates =
          repository.findRecoveryCandidates();

        expect(candidates).toHaveLength(1);
        expect(candidates[0].order_id)
          .toBe("order-1");
        expect(candidates[0].status)
          .toBe("NEW");
      },
    );

    it(
      "returns PARTIALLY_FILLED orders as recovery candidates",
      () => {
        db = createDatabase();

        const repository =
          new OrderRepository(db);

        repository.save(
          "test",
          createOrder({
            status: "PARTIALLY_FILLED",
            originalQuantity: 5,
            executedQuantity: 2,
          }),
        );

        const candidates =
          repository.findRecoveryCandidates();

        expect(candidates).toHaveLength(1);
        expect(candidates[0].status)
          .toBe("PARTIALLY_FILLED");
      },
    );

    it(
      "returns FILLED order when persisted trade quantity is incomplete",
      () => {
        db = createDatabase();

        const orders =
          new OrderRepository(db);

        const trades =
          new TradeRepository(db);

        orders.save(
          "test",
          createOrder({
            executedQuantity: 5,
          }),
        );

        trades.create({
          exchange: "test",
          symbol: "BTCUSDT",
          orderId: "order-1",
          side: "BUY",
          quantity: 2,
          price: 100,
          quoteQuantity: 200,
        });

        const candidates =
          orders.findRecoveryCandidates();

        expect(candidates).toHaveLength(1);
        expect(candidates[0].executed_quantity)
          .toBe(5);
      },
    );

    it(
      "does not return a fully accounted FILLED order",
      () => {
        db = createDatabase();

        const orders =
          new OrderRepository(db);

        const trades =
          new TradeRepository(db);

        orders.save(
          "test",
          createOrder({
            executedQuantity: 5,
          }),
        );

        trades.create({
          exchange: "test",
          symbol: "BTCUSDT",
          orderId: "order-1",
          side: "BUY",
          quantity: 5,
          price: 100,
          quoteQuantity: 500,
        });

        const candidates =
          orders.findRecoveryCandidates();

        expect(candidates).toHaveLength(0);
      },
    );

    it(
      "handles multiple partial fills using total persisted quantity",
      () => {
        db = createDatabase();

        const orders =
          new OrderRepository(db);

        const trades =
          new TradeRepository(db);

        orders.save(
          "test",
          createOrder({
            executedQuantity: 5,
          }),
        );

        trades.create({
          exchange: "test",
          symbol: "BTCUSDT",
          orderId: "order-1",
          side: "BUY",
          quantity: 2,
          price: 100,
          quoteQuantity: 200,
        });

        trades.create({
          exchange: "test",
          symbol: "BTCUSDT",
          orderId: "order-1",
          side: "BUY",
          quantity: 3,
          price: 101,
          quoteQuantity: 303,
        });

        expect(
          orders.findRecoveryCandidates(),
        ).toHaveLength(0);
      },
    );

    it(
      "keeps canceled and expired orders with executions recoverable",
      () => {
        db = createDatabase();

        const orders =
          new OrderRepository(db);

        const trades =
          new TradeRepository(db);

        for (const status of [
          "CANCELED",
          "EXPIRED",
        ]) {
          orders.save(
            "test",
            createOrder({
              orderId: `order-${status}`,
              status,
              executedQuantity: 5,
            }),
          );

          trades.create({
            exchange: "test",
            symbol: "BTCUSDT",
            orderId: `order-${status}`,
            side: "BUY",
            quantity: 2,
            price: 100,
            quoteQuantity: 200,
          });
        }

        const candidates =
          orders.findRecoveryCandidates();

        expect(
          candidates.map(
            (candidate) => candidate.status,
          ),
        ).toEqual([
          "CANCELED",
          "EXPIRED",
        ]);
      },
    );
  },
);
