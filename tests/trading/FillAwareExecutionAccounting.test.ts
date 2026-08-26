import { describe, expect, it } from "vitest";

import type {
  Exchange,
  ExchangeOrder,
} from "../../src/server/exchanges/core/types";

import {
  ExecutionAccountingService,
} from "../../src/server/trading/ExecutionAccountingService";

import {
  TradePersistenceService,
} from "../../src/server/trading/services/TradePersistenceService";

import {
  PositionService,
} from "../../src/server/trading/services/PositionService";

function exchange(): Exchange {
  return {
    id: "test",
    name: "Test",

    async ping() {
      return true;
    },

    async getServerTime() {
      return Date.now();
    },

    async getSymbol() {
      throw new Error();
    },

    async getBalances() {
      return [];
    },

    async getBalance() {
      return undefined;
    },

    async getPrice() {
      return 100;
    },

    async createOrder() {
      throw new Error();
    },

    async getOrder() {
      throw new Error();
    },

    async cancelOrder() {
      throw new Error();
    },

    close() {},
  };
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

function repositories() {
  const trades: any[] = [];
  const positions: any[] = [];

  const tradeRepository = {
    findByOrderId(exchange: string, orderId: string) {
      return trades.filter(
        (x) =>
          x.exchange === exchange &&
          x.order_id === orderId,
      );
    },

    create(input: any) {
      const item = {
        id: trades.length + 1,
        exchange: input.exchange,
        symbol: input.symbol,
        order_id: input.orderId,
        side: input.side,
        quantity: input.quantity,
        price: input.price,
        quote_quantity: input.quoteQuantity,
        fee: input.fee ?? 0,
        fee_asset: input.feeAsset,
        realized_pnl: input.realizedPnl,
        executed_at: input.executedAt,
      };

      trades.push(item);

      return item.id;
    },

    findBySymbol() {
      return trades;
    },

    findAll() {
      return trades;
    },
  } as any;

  const positionRepository = {
    create(input: any) {
      const item = {
        id: positions.length + 1,
        exchange: input.exchange,
        symbol: input.symbol,
        side: input.side,
        quantity: input.quantity,
        entry_price: input.entryPrice,
        current_price: undefined,
        realized_pnl: 0,
        unrealized_pnl: 0,
        status: "OPEN",
      };

      positions.push(item);

      return item.id;
    },

    findOpen(exchange: string, symbol: string) {
      return positions.find(
        (x) =>
          x.exchange === exchange &&
          x.symbol === symbol &&
          x.status === "OPEN",
      );
    },

    findAllOpen() {
      return positions.filter(
        (x) => x.status === "OPEN",
      );
    },

    increaseQuantity(
      id: number,
      quantity: number,
      price: number,
    ) {
      const p = positions.find(
        (x) => x.id === id,
      );

      const total =
        p.quantity + quantity;

      p.entry_price =
        (
          p.quantity * p.entry_price +
          quantity * price
        ) / total;

      p.quantity = total;
    },

    reduceQuantity(
      id: number,
      quantity: number,
      realizedPnl: number,
    ) {
      const p = positions.find(
        (x) => x.id === id,
      );

      p.quantity -= quantity;
      p.realized_pnl += realizedPnl;
    },

    updateMarketValue() {},

    close(
      id: number,
      realizedPnl: number,
    ) {
      const p = positions.find(
        (x) => x.id === id,
      );

      p.status = "CLOSED";
      p.quantity = 0;
      p.realized_pnl = realizedPnl;
    },

    findAll() {
      return positions;
    },
  } as any;

  return {
    trades,
    positions,
    tradeRepository,
    positionRepository,
  };
}

describe(
  "Fill-aware execution accounting",
  () => {
    it(
      "records only the newly executed quantity",
      () => {
        const r = repositories();
        const e = exchange();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              e,
              r.tradeRepository,
            ),
            new PositionService(
              e,
              r.positionRepository,
            ),
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

        expect(r.trades)
          .toHaveLength(2);

        expect(r.trades[0].quantity)
          .toBe(1);

        expect(r.trades[1].quantity)
          .toBe(0.5);

        expect(r.positions[0].quantity)
          .toBe(1.5);
      },
    );

    it(
      "does not process the same cumulative execution twice",
      () => {
        const r = repositories();
        const e = exchange();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              e,
              r.tradeRepository,
            ),
            new PositionService(
              e,
              r.positionRepository,
            ),
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

        expect(r.trades)
          .toHaveLength(1);

        expect(r.positions[0].quantity)
          .toBe(1);
      },
    );

    it(
      "reduces a position on partial SELL",
      () => {
        const r = repositories();
        const e = exchange();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              e,
              r.tradeRepository,
            ),
            new PositionService(
              e,
              r.positionRepository,
            ),
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

        expect(r.positions[0].quantity)
          .toBe(1.5);

        expect(r.positions[0].status)
          .toBe("OPEN");
      },
    );

    it(
      "closes the remaining position on final SELL",
      () => {
        const r = repositories();
        const e = exchange();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              e,
              r.tradeRepository,
            ),
            new PositionService(
              e,
              r.positionRepository,
            ),
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

        expect(r.positions[0].status)
          .toBe("CLOSED");

        expect(r.positions[0].quantity)
          .toBe(0);

        expect(r.positions[0].realized_pnl)
          .toBe(20);
      },
    );
  },
);
