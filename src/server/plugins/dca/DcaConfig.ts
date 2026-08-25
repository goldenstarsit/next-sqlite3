export interface DcaOrderConfig {
  id: number;
  percentage: number;
  enabled: boolean;
}

export interface DcaConfig {
  enabled: boolean;
  symbol: string;

  /**
   * Number of DCA orders.
   */
  orderCount: number;

  /**
   * DCA percentages are calculated from
   * the initial entry price.
   *
   * Example:
   * initial = 100
   * percentage = 5
   * price = 95
   */
  orders: DcaOrderConfig[];

  /**
   * If enabled, Binance filters determine
   * the minimum valid order amount.
   */
  useMinimumExchangeAmount: boolean;

  /**
   * Optional manually configured amount.
   * Exchange minimum remains the default.
   */
  buyAmount?: number;

  sellAmount?: number;
}
