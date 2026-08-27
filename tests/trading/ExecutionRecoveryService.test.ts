import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ExecutionRecoveryService,
} from "../../src/server/trading/ExecutionRecoveryService";

describe(
  "ExecutionRecoveryService",
  () => {
    it(
      "recovers persisted orders through the exchange and accounting layer",
      async () => {
        const order =
          {
            symbol: "BTCUSDT",
            orderId: "order-1",
            side: "BUY",
            type: "LIMIT",
            status: "FILLED",
            price: 100,
            originalQuantity: 2,
            executedQuantity: 2,
            transactTime: 2000,
          } as any;

        const orderPersistence = {
          findRecoveryCandidates:
            vi.fn().mockReturnValue([
              {
                id: 1,
                exchange: "test",
                symbol: "BTCUSDT",
                order_id: "order-1",
                status: "FILLED",
                executed_quantity: 0,
              },
            ]),

          getExchangeOrder:
            vi.fn().mockResolvedValue(order),

          save:
            vi.fn().mockReturnValue(1),
        } as any;

        const accounting = {
          process:
            vi.fn().mockReturnValue({
              order,
              tradeId: 10,
              positionId: 20,
              executedQuantity: 2,
              action: "POSITION_OPENED",
            }),
        } as any;

        const service =
          new ExecutionRecoveryService(
            orderPersistence,
            accounting,
          );

        const result =
          await service.recover();

        expect(
          orderPersistence.getExchangeOrder,
        ).toHaveBeenCalledWith(
          "BTCUSDT",
          "order-1",
        );

        expect(
          orderPersistence.save,
        ).toHaveBeenCalledWith(
          order,
        );

        expect(
          accounting.process,
        ).toHaveBeenCalledWith(
          order,
        );

        expect(result.attempted)
          .toBe(1);

        expect(result.recovered)
          .toBe(1);

        expect(result.failed)
          .toBe(0);
      },
    );

    it(
      "counts a successfully recovered zero-fill order as recovered",
      async () => {
        const order =
          {
            symbol: "BTCUSDT",
            orderId: "order-canceled",
            side: "BUY",
            type: "LIMIT",
            status: "CANCELED",
            price: 100,
            originalQuantity: 2,
            executedQuantity: 0,
            transactTime: 2000,
          } as any;

        const orderPersistence = {
          findRecoveryCandidates:
            vi.fn().mockReturnValue([
              {
                id: 1,
                exchange: "test",
                symbol: "BTCUSDT",
                order_id: "order-canceled",
                status: "CANCELED",
                executed_quantity: 0,
              },
            ]),

          getExchangeOrder:
            vi.fn().mockResolvedValue(order),

          save:
            vi.fn().mockReturnValue(1),
        } as any;

        const accounting = {
          process:
            vi.fn().mockReturnValue({
              order,
              tradeId: undefined,
              positionId: undefined,
              executedQuantity: 0,
              action: "NO_EXECUTION",
            }),
        } as any;

        const service =
          new ExecutionRecoveryService(
            orderPersistence,
            accounting,
          );

        const result =
          await service.recover();

        expect(result.attempted)
          .toBe(1);

        expect(result.recovered)
          .toBe(1);

        expect(result.failed)
          .toBe(0);

        expect(
          orderPersistence.save,
        ).toHaveBeenCalledWith(order);

        expect(
          accounting.process,
        ).toHaveBeenCalledWith(order);
      },
    );

    it(
      "continues recovering when one candidate fails",
      async () => {
        const successfulOrder =
          {
            symbol: "ETHUSDT",
            orderId: "order-2",
            side: "BUY",
            type: "MARKET",
            status: "FILLED",
            price: 200,
            originalQuantity: 1,
            executedQuantity: 1,
            transactTime: 2000,
          } as any;

        const orderPersistence = {
          findRecoveryCandidates:
            vi.fn().mockReturnValue([
              {
                id: 1,
                exchange: "test",
                symbol: "BTCUSDT",
                order_id: "order-1",
                status: "FILLED",
                executed_quantity: 0,
              },
              {
                id: 2,
                exchange: "test",
                symbol: "ETHUSDT",
                order_id: "order-2",
                status: "FILLED",
                executed_quantity: 0,
              },
            ]),

          getExchangeOrder:
            vi.fn()
              .mockRejectedValueOnce(
                new Error("Exchange unavailable"),
              )
              .mockResolvedValueOnce(
                successfulOrder,
              ),

          save:
            vi.fn().mockReturnValue(2),
        } as any;

        const accounting = {
          process:
            vi.fn().mockReturnValue({
              order: successfulOrder,
              tradeId: 20,
              positionId: 30,
              executedQuantity: 1,
              action: "POSITION_OPENED",
            }),
        } as any;

        const service =
          new ExecutionRecoveryService(
            orderPersistence,
            accounting,
          );

        const result =
          await service.recover();

        expect(result).toEqual({
          attempted: 2,
          recovered: 1,
          failed: 1,
          results: [
            {
              orderId: "order-1",
              symbol: "BTCUSDT",
              error: "Exchange unavailable",
            },
            {
              orderId: "order-2",
              symbol: "ETHUSDT",
              order: successfulOrder,
              accounting: {
                order: successfulOrder,
                tradeId: 20,
                positionId: 30,
                executedQuantity: 1,
                action: "POSITION_OPENED",
              },
            },
          ],
        });

        expect(
          accounting.process,
        ).toHaveBeenCalledTimes(1);
      },
    );

    it(
      "is safe when there is nothing to recover",
      async () => {
        const orderPersistence = {
          findRecoveryCandidates:
            vi.fn().mockReturnValue([]),

          getExchangeOrder:
            vi.fn(),

          save:
            vi.fn(),
        } as any;

        const accounting = {
          process:
            vi.fn(),
        } as any;

        const service =
          new ExecutionRecoveryService(
            orderPersistence,
            accounting,
          );

        const result =
          await service.recover();

        expect(result)
          .toEqual({
            attempted: 0,
            recovered: 0,
            failed: 0,
            results: [],
          });

        expect(
          orderPersistence.getExchangeOrder,
        ).not.toHaveBeenCalled();

        expect(
          accounting.process,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
