export interface DcaOrderConfig {
  /**
   * New strategy configuration.
   */
  percentageFromInitialEntry?: number;
  amountPercentage?: number;

  /**
   * Legacy plugin configuration.
   * Kept for backward compatibility.
   */
  id?: number;
  percentage?: number;
  enabled?: boolean;
}

export interface DcaConfig {
  enabled: boolean;

  /**
   * New configuration.
   */
  orders: DcaOrderConfig[];

  defaultAmountPercentage?: number;

  minimumOrderMode?:
    | "exchange-minimum"
    | "fixed";

  minimumOrderAmount?: number;

  /**
   * Legacy configuration.
   */
  symbol?: string;
  quoteAsset?: string;

  orderCount?: number;

  buyAmount?: number;
  sellAmount?: number;

  useMinimumExchangeAmount?: boolean;
}
