import type {
  ExchangeOrder,
} from "../exchanges/core/types";

import type {
  Database,
  DatabaseExecutor,
} from "../database/core/types";

import {
  TradeRepository,
} from "../database/repositories/TradeRepository";

import {
  PositionRepository,
} from "../database/repositories/PositionRepository";

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
    private readonly db: Database,
    private readonly exchangeId: string,
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

    if (
      !Number.isFinite(order.price) ||
      order.price <= 0
    ) {
      throw new Error(
        `Cannot account execution ${order.orderId}: invalid execution price ${order.price}`,
      );
    }

    return this.db.transaction((tx) => {
      return this.processTransaction(
        tx,
        order,
      );
    });
  }

  private processTransaction(
    db: DatabaseExecutor,
    order: ExchangeOrder,
  ): ExecutionAccountingResult {
    const tradeRepository =
      new TradeRepository(db);

    const positionRepository =
      new PositionRepository(db);

    const previousTrades =
      tradeRepository.findByOrderId(
        this.exchangeId,
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
      const position =
        positionRepository.findOpen(
          this.exchangeId,
          order.symbol,
        );

      return {
        order,
        tradeId: previousTrades[0]?.id,
        positionId: position?.id,
        action: "TRADE_RECORDED",
      };
    }

    const price = order.price;

    const tradeId =
      tradeRepository.create({
        exchange: this.exchangeId,
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
        positionRepository.findOpen(
          this.exchangeId,
          order.symbol,
        );

      if (existingPosition) {
        positionRepository.increaseQuantity(
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
        positionRepository.create({
          exchange: this.exchangeId,
          symbol: order.symbol,
          side: "LONG",
          quantity: newQuantity,
          entryPrice: price,
        });

      return {
        order,
        tradeId,
        positionId,
        executedQuantity: newQuantity,
        action: "POSITION_OPENED",
      };
    }

    const position =
      positionRepository.findOpen(
        this.exchangeId,
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
      positionRepository.close(
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

    positionRepository.reduceQuantity(
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
