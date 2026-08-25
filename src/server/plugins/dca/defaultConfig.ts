import type { DcaConfig } from "./DcaConfig";

export const defaultDcaConfig: DcaConfig = {
  enabled: false,
  symbol: "BTCUSDT",

  orderCount: 3,

  orders: [
    {
      id: 1,
      percentage: 2,
      enabled: true,
    },
    {
      id: 2,
      percentage: 5,
      enabled: true,
    },
    {
      id: 3,
      percentage: 10,
      enabled: true,
    },
  ],

  /**
   * Binance exchange minimum is used by default.
   */
  useMinimumExchangeAmount: true,
};
