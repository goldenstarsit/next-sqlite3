import { describe, expect, it, vi } from "vitest";

import type {
  ExchangeOrder,
} from "../../src/server/exchanges/core/types";

import {
  ExecutionReconciliationService,
} from "../../src/server/trading/ExecutionReconciliationService";

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
  "ExecutionReconciliationService",
  () => {
    it(
      "fetches the exchange order and reconciles it",
      async () => {
        const exchangeOrder = order();

        const orderService = {
          getOrder: vi
            .fn()
            .mockResolvedValue(
              exchangeOrder,
            ),
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
              order: exchangeOrder,
              tradeId: 20,
              positionId: 30,
              executedQuantity: 1,
              action: "POSITION_OPENED",
            }),
        } as any;

        const service =
          new ExecutionReconciliationService(
            orderService,
            orderPersistence,
            accounting,
          );

        const result =
          await service.reconcile(
            "BTCUSDT",
            "order-1",
          );

        expect(
          orderService.getOrder,
        ).toHaveBeenCalledWith(
          "BTCUSDT",
          "order-1",
        );

        expect(
          orderPersistence.save,
        ).toHaveBeenCalledWith(
          exchangeOrder,
        );

        expect(
          accounting.process,
        ).toHaveBeenCalledWith(
          exchangeOrder,
        );

        expect(
          result.persistedOrderId,
        ).toBe(10);

        expect(
          result.accounting.tradeId,
        ).toBe(20);

        expect(
          result.accounting.positionId,
        ).toBe(30);
      },
    );

    it(
      "uses the latest cumulative exchange execution state",
      async () => {
        const firstOrder = order({
          executedQuantity: 1,
        });

        const secondOrder = order({
          executedQuantity: 1.5,
          transactTime: 2000,
        });

        const orderService = {
          getOrder: vi
            .fn()
            .mockResolvedValueOnce(
              firstOrder,
            )
            .mockResolvedValueOnce(
              secondOrder,
            ),
        } as any;

        const orderPersistence = {
          save: vi
            .fn()
            .mockReturnValueOnce(10)
            .mockReturnValueOnce(10),
        } as any;

        const accounting = {
          process: vi
            .fn()
            .mockReturnValueOnce({
              order: firstOrder,
              tradeId: 20,
              positionId: 30,
              executedQuantity: 1,
              action: "POSITION_OPENED",
            })
            .mockReturnValueOnce({
              order: secondOrder,
              tradeId: 21,
              positionId: 30,
              executedQuantity: 0.5,
              action: "POSITION_INCREASED",
            }),
        } as any;

        const service =
          new ExecutionReconciliationService(
            orderService,
            orderPersistence,
            accounting,
          );

        const first =
          await service.reconcile(
            "BTCUSDT",
            "order-1",
          );

        const second =
          await service.reconcile(
            "BTCUSDT",
            "order-1",
          );

        expect(
          first.accounting.executedQuantity,
        ).toBe(1);

        expect(
          second.accounting.executedQuantity,
        ).toBe(0.5);

        expect(
          accounting.process,
        ).toHaveBeenNthCalledWith(
          1,
          firstOrder,
        );

        expect(
          accounting.process,
        ).toHaveBeenNthCalledWith(
          2,
          secondOrder,
        );
      },
    );

    it(
      "does not alter the accounting result",
      async () => {
        const exchangeOrder =
          order({
            side: "SELL",
            status: "FILLED",
            executedQuantity: 0.5,
            price: 110,
          });

        const accountingResult = {
          order: exchangeOrder,
          tradeId: 40,
          positionId: 30,
          realizedPnl: 5,
          executedQuantity: 0.5,
          action: "POSITION_REDUCED",
        };

        const orderService = {
          getOrder: vi
            .fn()
            .mockResolvedValue(
              exchangeOrder,
            ),
        } as any;

        const orderPersistence = {
          save: vi
            .fn()
            .mockReturnValue(10),
        } as any;

        const accounting = {
          process: vi
            .fn()
            .mockReturnValue(
              accountingResult,
            ),
        } as any;

        const service =
          new ExecutionReconciliationService(
            orderService,
            orderPersistence,
            accounting,
          );

        const result =
          await service.reconcile(
            "BTCUSDT",
            "order-1",
          );

        expect(
          result.accounting,
        ).toEqual(
          accountingResult,
        );
      },
    );
  },
);
