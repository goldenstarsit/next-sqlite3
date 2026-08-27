import type {
  Exchange,
  ExchangeOrderRequest,
} from "../exchanges/core/types";

import type {
  StrategyOrder,
} from "../strategies/core/types";

import {
  normalizeQuantity,
} from "../exchanges/core/OrderRules";

export interface StrategyExecutionBalances {
  quoteFree: number;
  baseFree: number;
}

export interface ResolvedStrategyOrder {
  strategyOrder: StrategyOrder;
  request: ExchangeOrderRequest;
}

export class StrategyOrderResolver {
  constructor(
    private readonly exchange: Exchange,
  ) {}

  async resolve(
    order: StrategyOrder,
    balances?: StrategyExecutionBalances,
  ): Promise<ResolvedStrategyOrder> {
    if (!order.symbol) {
      throw new Error(
        "Strategy order symbol is required.",
      );
    }

    const specifications = [
      order.quantity !== undefined,
      order.quoteAmount !== undefined,
      order.amount !== undefined,
    ].filter(Boolean).length;

    if (specifications === 0) {
      throw new Error(
        "Strategy order requires quantity, quote amount, or amount.",
      );
    }

    if (specifications > 1) {
      throw new Error(
        "Strategy order cannot contain multiple amount specifications.",
      );
    }

    const symbol =
      await this.exchange.getSymbol(
        order.symbol,
      );

    if (order.quantity !== undefined) {
      return this.resolveQuantity(
        order,
        symbol,
      );
    }

    if (order.quoteAmount !== undefined) {
      return this.resolveQuoteAmount(
        order,
        symbol.filters.minNotional,
      );
    }

    return this.resolveAmount(
      order,
      symbol,
      balances,
    );
  }

  private resolveQuantity(
    order: StrategyOrder,
    symbol: Awaited<
      ReturnType<Exchange["getSymbol"]>
    >,
  ): ResolvedStrategyOrder {
    const requestedQuantity =
      order.quantity!;

    if (requestedQuantity <= 0) {
      throw new Error(
        "Strategy order quantity must be greater than zero.",
      );
    }

    if (
      symbol.filters.minQty !== undefined &&
      requestedQuantity <
        symbol.filters.minQty
    ) {
      throw new Error(
        "Strategy order quantity is below exchange minimum.",
      );
    }

    if (
      symbol.filters.maxQty !== undefined &&
      requestedQuantity >
        symbol.filters.maxQty
    ) {
      throw new Error(
        "Strategy order quantity exceeds exchange maximum.",
      );
    }

    const quantity =
      symbol.filters.stepSize !== undefined &&
      symbol.filters.stepSize > 0
        ? normalizeQuantity(
            requestedQuantity,
            {
              symbol: symbol.symbol,
              filters: symbol.filters,
            },
          )
        : requestedQuantity;

    if (quantity <= 0) {
      throw new Error(
        "Strategy order quantity becomes zero after normalization.",
      );
    }

    if (
      symbol.filters.minQty !== undefined &&
      quantity <
        symbol.filters.minQty
    ) {
      throw new Error(
        "Strategy order quantity is below exchange minimum after normalization.",
      );
    }

    return {
      strategyOrder: order,

      request: {
        symbol: order.symbol,
        side: order.side,
        type: "MARKET",
        quantity,
      },
    };
  }

  private resolveQuoteAmount(
    order: StrategyOrder,
    minNotional?: number,
  ): ResolvedStrategyOrder {
    const quoteAmount =
      order.quoteAmount!;

    if (quoteAmount <= 0) {
      throw new Error(
        "Strategy order quote amount must be greater than zero.",
      );
    }

    if (
      minNotional !== undefined &&
      quoteAmount < minNotional
    ) {
      throw new Error(
        "Strategy order quote amount is below exchange minimum.",
      );
    }

    return {
      strategyOrder: order,

      request: {
        symbol: order.symbol,
        side: order.side,
        type: "MARKET",
        quoteOrderQty: quoteAmount,
      },
    };
  }

  private resolveAmount(
    order: StrategyOrder,
    symbol: Awaited<
      ReturnType<Exchange["getSymbol"]>
    >,
    balances?: StrategyExecutionBalances,
  ): ResolvedStrategyOrder {
    const amount =
      order.amount!;

    if (
      !Number.isFinite(amount.value) ||
      amount.value <= 0
    ) {
      throw new Error(
        "Strategy order amount must be greater than zero.",
      );
    }

    if (
      amount.mode === "PERCENTAGE" &&
      amount.value > 100
    ) {
      throw new Error(
        "Strategy order percentage must be greater than 0 and at most 100.",
      );
    }

    if (
      amount.mode !== "ABSOLUTE" &&
      amount.mode !== "PERCENTAGE"
    ) {
      throw new Error(
        "Unsupported strategy order amount mode.",
      );
    }

    if (
      amount.mode === "PERCENTAGE" &&
      !balances
    ) {
      throw new Error(
        "Strategy order balances are required for percentage amounts.",
      );
    }

    if (order.side === "BUY") {
      const quoteAmount =
        amount.mode === "PERCENTAGE"
          ? balances!.quoteFree *
            amount.value /
            100
          : amount.value;

      return this.resolveQuoteAmount(
        {
          ...order,
          quoteAmount,
          amount: undefined,
        },
        symbol.filters.minNotional,
      );
    }

    const requestedQuantity =
      amount.mode === "PERCENTAGE"
        ? balances!.baseFree *
          amount.value /
          100
        : amount.value;

    return this.resolveQuantity(
      {
        ...order,
        quantity: requestedQuantity,
        amount: undefined,
      },
      symbol,
    );
  }
}
