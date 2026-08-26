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

function createExchange(): Exchange {
  return {
    id: "test",
    name: "Test Exchange",

    async ping() {
      return true;
    },

    async getServerTime() {
      return Date.now();
    },

    async getSymbol() {
      throw new Error("not implemented");
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
      throw new Error("not implemented");
    },

    async getOrder() {
      throw new Error("not implemented");
    },

    async cancelOrder() {
      throw new Error("not implemented");
    },

    close() {},
  };
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

function createRepositories() {
  const trades: any[] = [];
  const positions: any[] = [];

  const tradeRepository = {
    findByOrderId(exchange: string, orderId: string) {
      return trades.filter(
        (trade) =>
          trade.exchange === exchange &&
          trade.order_id === orderId,
      );
    },

    create(input: any) {
      const trade = {
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

      trades.push(trade);

      return trade.id;
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
      const position = {
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

      positions.push(position);

      return position.id;
    },

    findOpen(exchange: string, symbol: string) {
      return positions.find(
        (position) =>
          position.exchange === exchange &&
          position.symbol === symbol &&
          position.status === "OPEN",
      );
    },

    findAllOpen() {
      return positions.filter(
        (position) => position.status === "OPEN",
      );
    },

    updateMarketValue() {},

    close(id: number, realizedPnl: number) {
      const position = positions.find(
        (position) => position.id === id,
      );

      if (!position) {
        throw new Error("Position not found");
      }

      position.status = "CLOSED";
      position.realized_pnl = realizedPnl;
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
  "ExecutionAccountingService",
  () => {
    it(
      "records a filled BUY and opens a position",
      () => {
        const exchange = createExchange();
        const repositories = createRepositories();

        const tradePersistence =
          new TradePersistenceService(
            exchange,
            repositories.tradeRepository,
          );

        const positionService =
          new PositionService(
            exchange,
            repositories.positionRepository,
          );

        const service =
          new ExecutionAccountingService(
            tradePersistence,
            positionService,
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

        expect(
          repositories.trades,
        ).toHaveLength(1);

        expect(
          repositories.positions,
        ).toHaveLength(1);

        expect(
          repositories.positions[0].entry_price,
        ).toBe(100);
      },
    );

    it(
      "does not duplicate an already persisted order",
      () => {
        const exchange = createExchange();
        const repositories = createRepositories();

        const tradePersistence =
          new TradePersistenceService(
            exchange,
            repositories.tradeRepository,
          );

        const positionService =
          new PositionService(
            exchange,
            repositories.positionRepository,
          );

        const service =
          new ExecutionAccountingService(
            tradePersistence,
            positionService,
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

        expect(
          repositories.trades,
        ).toHaveLength(1);

        expect(
          repositories.positions,
        ).toHaveLength(1);
      },
    );

    it(
      "ignores orders without execution",
      () => {
        const exchange = createExchange();
        const repositories = createRepositories();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              exchange,
              repositories.tradeRepository,
            ),
            new PositionService(
              exchange,
              repositories.positionRepository,
            ),
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
          repositories.trades,
        ).toHaveLength(0);

        expect(
          repositories.positions,
        ).toHaveLength(0);
      },
    );

    it(
      "closes a position on a filled SELL and calculates realized PnL",
      () => {
        const exchange = createExchange();
        const repositories = createRepositories();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              exchange,
              repositories.tradeRepository,
            ),
            new PositionService(
              exchange,
              repositories.positionRepository,
            ),
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

        expect(
          repositories.positions[0].status,
        ).toBe("CLOSED");

        expect(
          repositories.positions[0].realized_pnl,
        ).toBe(10);
      },
    );

    it(
      "ignores a SELL when there is no open position",
      () => {
        const exchange = createExchange();
        const repositories = createRepositories();

        const service =
          new ExecutionAccountingService(
            new TradePersistenceService(
              exchange,
              repositories.tradeRepository,
            ),
            new PositionService(
              exchange,
              repositories.positionRepository,
            ),
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
          repositories.trades,
        ).toHaveLength(1);

        expect(
          repositories.positions,
        ).toHaveLength(0);
      },
    );
  },
);
