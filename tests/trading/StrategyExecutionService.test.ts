import { describe, expect, it, vi } from "vitest";

import type {
  Exchange,
  ExchangeOrder,
} from "../../src/server/exchanges/core/types";

import {
  StrategyExecutionService,
} from "../../src/server/trading/StrategyExecutionService";

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
      return {
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        status: "TRADING",
        orderTypes: ["MARKET", "LIMIT"],
        filters: {},
      };
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
      return {
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "PARTIALLY_FILLED",
        price: 100,
        originalQuantity: 2,
        executedQuantity: 1,
        transactTime: 1000,
      };
    },

    async getOrder() {
      return {
        symbol: "BTCUSDT",
        orderId: "order-1",
        side: "BUY",
        type: "MARKET",
        status: "PARTIALLY_FILLED",
        price: 100,
        originalQuantity: 2,
        executedQuantity: 1,
        transactTime: 1000,
      };
    },

    async cancelOrder() {
      throw new Error();
    },

    close() {},
  };
}

const strategyOrder = {
  symbol: "BTCUSDT",
  side: "BUY",
  type: "MARKET",
  quantity: 2,
} as any;

describe(
  "StrategyExecutionService",
  () => {
    it(
      "creates and persists the exchange order",
      async () => {
        const e = exchange();

        const createdOrder = {
          symbol: "BTCUSDT",
          orderId: "order-1",
          side: "BUY",
          type: "MARKET",
          status: "PARTIALLY_FILLED",
          price: 100,
          originalQuantity: 2,
          executedQuantity: 1,
          transactTime: 1000,
        } satisfies ExchangeOrder;

        const orderService = {
          getExchange: () => e,

          createOrder: vi
            .fn()
            .mockResolvedValue(createdOrder),
        } as any;

        const orderPersistence = {
          save: vi
            .fn()
            .mockReturnValue(10),
        } as any;

        const reconciliation = {
          reconcile: vi
            .fn()
            .mockResolvedValue({
              order: createdOrder,
              persistedOrderId: 10,
              accounting: {
                order: createdOrder,
                tradeId: 20,
                positionId: 30,
                executedQuantity: 1,
                action: "POSITION_OPENED",
              },
            }),
        } as any;

        const service =
          new StrategyExecutionService(
            orderService,
            orderPersistence,
            reconciliation,
          );

        const result =
          await service.execute(
            strategyOrder,
          );

        expect(
          orderService.createOrder,
        ).toHaveBeenCalledTimes(1);

        expect(
          orderPersistence.save,
        ).toHaveBeenCalledWith(
          createdOrder,
        );

        expect(
          reconciliation.reconcile,
        ).toHaveBeenCalledWith(
          "BTCUSDT",
          "order-1",
        );

        expect(
          result.persistedOrderId,
        ).toBe(10);

        expect(
          result.reconciliation?.accounting
            .executedQuantity,
        ).toBe(1);

        expect(
          result.reconciliation?.accounting
            .positionId,
        ).toBe(30);
      },
    );

    it(
      "returns the reconciliation accounting result",
      async () => {
        const e = exchange();

        const createdOrder = {
          symbol: "BTCUSDT",
          orderId: "order-2",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 110,
          originalQuantity: 1,
          executedQuantity: 1,
          transactTime: 2000,
        } satisfies ExchangeOrder;

        const accounting = {
          order: createdOrder,
          tradeId: 40,
          positionId: 30,
          realizedPnl: 10,
          executedQuantity: 1,
          action: "POSITION_CLOSED",
        };

        const orderService = {
          getExchange: () => e,

          createOrder: vi
            .fn()
            .mockResolvedValue(
              createdOrder,
            ),
        } as any;

        const orderPersistence = {
          save: vi
            .fn()
            .mockReturnValue(11),
        } as any;

        const reconciliation = {
          reconcile: vi
            .fn()
            .mockResolvedValue({
              order: createdOrder,
              persistedOrderId: 11,
              accounting,
            }),
        } as any;

        const service =
          new StrategyExecutionService(
            orderService,
            orderPersistence,
            reconciliation,
          );

        const result =
          await service.execute(
            strategyOrder,
          );

        expect(
          result.reconciliation?.accounting,
        ).toEqual(accounting);

        expect(
          result.reconciliation?.accounting
            .realizedPnl,
        ).toBe(10);

        expect(
          result.reconciliation?.accounting
            .action,
        ).toBe("POSITION_CLOSED");
      },
    );
  },
);
