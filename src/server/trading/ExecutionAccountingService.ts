import type {
  ExchangeOrder,
} from "../exchanges/core/types";

import {
  TradePersistenceService,
} from "./services/TradePersistenceService";

import {
  PositionService,
} from "./services/PositionService";

export interface ExecutionAccountingResult {
  order: ExchangeOrder;
  tradeId?: number;
  positionId?: number;
  realizedPnl?: number;
  executedQuantity?: number;
  action:
    | "IGNORED"
    | "TRADE_RECORDED"
    | "POSITION_OPENED"
    | "POSITION_INCREASED"
    | "POSITION_REDUCED"
    | "POSITION_CLOSED";
}

export class ExecutionAccountingService {
  constructor(
    private readonly tradePersistence: TradePersistenceService,
    private readonly positionService: PositionService,
  ) {}

  process(
    order: ExchangeOrder,
  ): ExecutionAccountingResult {
    if (
      order.status !== "FILLED" &&
      order.status !== "PARTIALLY_FILLED"
    ) {
      return {
        order,
        action: "IGNORED",
      };
    }

    if (
      !Number.isFinite(order.executedQuantity) ||
      order.executedQuantity <= 0
    ) {
      return {
        order,
        action: "IGNORED",
      };
    }

    const previousTrades =
      this.tradePersistence.findByOrderId(
        order.orderId,
      );

    const previouslyRecordedQuantity =
      previousTrades.reduce(
        (sum, trade) =>
          sum + trade.quantity,
        0,
      );

    const newQuantity =
      order.executedQuantity -
      previouslyRecordedQuantity;

    if (newQuantity <= 1e-12) {
      return {
        order,
        tradeId: previousTrades[0]?.id,
        positionId:
          this.positionService
            .getOpen(order.symbol)
            ?.id,
        action: "TRADE_RECORDED",
      };
    }

    if (
      !Number.isFinite(order.price) ||
      order.price <= 0
    ) {
      throw new Error(
        `Cannot account execution ${order.orderId}: invalid execution price ${order.price}`,
      );
    }

    const price = order.price;

    const tradeId =
      this.tradePersistence.persist({
        symbol: order.symbol,
        orderId: order.orderId,
        side: order.side,
        quantity: newQuantity,
        price,
        quoteQuantity:
          newQuantity * price,
        executedAt:
          order.transactTime,
      });

    if (order.side === "BUY") {
      const existingPosition =
        this.positionService.getOpen(
          order.symbol,
        );

      if (existingPosition) {
        this.positionService.increaseQuantity(
          existingPosition.id,
          newQuantity,
          price,
        );

        return {
          order,
          tradeId,
          positionId: existingPosition.id,
          executedQuantity: newQuantity,
          action: "POSITION_INCREASED",
        };
      }

      const positionId =
        this.positionService.open(
          order.symbol,
          "LONG",
          newQuantity,
          price,
        );

      return {
        order,
        tradeId,
        positionId,
        executedQuantity: newQuantity,
        action: "POSITION_OPENED",
      };
    }

    const position =
      this.positionService.getOpen(
        order.symbol,
      );

    if (!position) {
      return {
        order,
        tradeId,
        executedQuantity: newQuantity,
        action: "TRADE_RECORDED",
      };
    }

    const closeQuantity =
      Math.min(
        newQuantity,
        position.quantity,
      );

    const realizedPnl =
      (price - position.entry_price) *
      closeQuantity;

    if (
      closeQuantity >=
      position.quantity - 1e-12
    ) {
      this.positionService.close(
        position.id,
        position.realized_pnl +
          realizedPnl,
      );

      return {
        order,
        tradeId,
        positionId: position.id,
        realizedPnl,
        executedQuantity: closeQuantity,
        action: "POSITION_CLOSED",
      };
    }

    this.positionService.reduceQuantity(
      position.id,
      closeQuantity,
      realizedPnl,
    );

    return {
      order,
      tradeId,
      positionId: position.id,
      realizedPnl,
      executedQuantity: closeQuantity,
      action: "POSITION_REDUCED",
    };
  }
}
