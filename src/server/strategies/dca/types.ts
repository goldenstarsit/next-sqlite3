export type DCAAmountMode =
  | "auto"
  | "fixed"
  | "balancePercent";

export interface DCAOrderConfig {
  id: string;
  percentage: number;
  amountMode: DCAAmountMode;
  amount?: number;
}

export interface DCAConfig {
  enabled: boolean;

  symbol: string;
  quoteAsset: string;

  initialAmountMode: DCAAmountMode;
  initialAmount?: number;

  takeProfitPercent: number;
  stopLossPercent: number;

  dcaOrders: DCAOrderConfig[];
}

export interface DCAPosition {
  symbol: string;
  initialEntryPrice: number;
  initialQuantity: number;

  executedDCAOrderIds: string[];

  openedAt: string;
}
