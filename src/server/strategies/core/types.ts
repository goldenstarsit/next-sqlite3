export type StrategyOrderSide = "BUY" | "SELL";

import type {
  StrategyAmount,
} from "./amount";

export type {
  StrategyAmountMode,
  StrategyAmount,
} from "./amount";

export interface StrategyOrder {
  symbol: string;
  side: StrategyOrderSide;
  price?: number;
  quantity?: number;

  /**
   * Explicit amount semantics.
   *
   * ABSOLUTE   = actual quote/base amount.
   * PERCENTAGE = percentage of the relevant available balance.
   */
  amount?: StrategyAmount;

  /**
   * Legacy absolute quote amount.
   *
   * Kept temporarily for backward compatibility.
   */
  quoteAmount?: number;
  reason?: string;
  level?: number;
}

export interface StrategyContext {
  symbol: string;
  currentPrice: number;
  initialEntryPrice?: number;
  availableQuoteBalance?: number;
  availableBaseBalance?: number;
}

export interface StrategyManifest {
  id: string;
  name: string;
  version: string;
  description: string;
}

export interface TradingStrategy<TConfig = unknown> {
  readonly id: string;
  readonly name: string;

  getConfig(): TConfig;

  updateConfig(config: TConfig): void;

  validateConfig(config: TConfig): void;

  calculateOrders(
    context: StrategyContext,
  ): StrategyOrder[];
}

/**
 * Backward-compatible strategy plugin type.
 *
 * New strategies should implement TradingStrategy directly.
 */
export type Strategy<TConfig = unknown> =
  TradingStrategy<TConfig>;
