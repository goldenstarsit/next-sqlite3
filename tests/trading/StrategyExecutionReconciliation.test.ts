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
      throw new Error();
    },

    async cancelOrder() {
      throw new Error();
    },

    createMarketDataStream: () => ({
      subscribe: async () => {},
      unsubscribe: async () => {},
      onMarketData: () => () => {},
      close: () => {},
    }),
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
  "StrategyExecutionService reconciliation",
  () => {
    it(
      "creates and persists the initial exchange order",
      async () => {
        const e = exchange();

        const orderService = {
          getExchange: () => e,

          createOrder: vi
            .fn()
            .mockResolvedValue({
              symbol: "BTCUSDT",
              orderId: "order-1",
              side: "BUY",
              type: "MARKET",
              status: "PARTIALLY_FILLED",
              price: 100,
              originalQuantity: 2,
              executedQuantity: 1,
              transactTime: 1000,
            } satisfies ExchangeOrder),
        } as any;

        const orderPersistence = {
          save: vi
            .fn()
            .mockReturnValue(10),
        } as any;

        const service =
          new StrategyExecutionService(
            orderService,
            orderPersistence,
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
        ).toHaveBeenCalledTimes(1);

        expect(
          result.persistedOrderId,
        ).toBe(10);

        expect(
          result.order.orderId,
        ).toBe("order-1");
      },
    );

    it(
      "can reconcile the created order through the trading service layer",
      async () => {
        const e = exchange();

        const orderService = {
          getExchange: () => e,

          createOrder: vi
            .fn()
            .mockResolvedValue({
              symbol: "BTCUSDT",
              orderId: "order-1",
              side: "BUY",
              type: "MARKET",
              status: "NEW",
              price: 100,
              originalQuantity: 2,
              executedQuantity: 0,
              transactTime: 1000,
            }),

          getOrder: vi
            .fn()
            .mockResolvedValue({
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

        const orderPersistence = {
          save: vi
            .fn()
            .mockReturnValue(10),
        } as any;

        const accounting = {
          process: vi
            .fn()
            .mockReturnValue({
              action: "POSITION_OPENED",
              executedQuantity: 2,
              positionId: 1,
              tradeId: 1,
            }),
        } as any;

        const reconciliation = {
          reconcile: vi
            .fn()
            .mockResolvedValue({
              persistedOrderId: 10,
              accounting: {
                action: "POSITION_OPENED",
                executedQuantity: 2,
                positionId: 1,
                tradeId: 1,
              },
            }),
        } as any;

        expect(reconciliation.reconcile)
          .not
          .toHaveBeenCalled();

        const created =
          await orderService.createOrder(
            strategyOrder,
          );

        orderPersistence.save(created);

        const result =
          await reconciliation.reconcile(
            created.symbol,
            created.orderId,
          );

        expect(
          reconciliation.reconcile,
        ).toHaveBeenCalledWith(
          "BTCUSDT",
          "order-1",
        );

        expect(
          result.accounting.executedQuantity,
        ).toBe(2);
      },
    );
  },
);
