import type { DCAConfig } from "./types";

export const defaultDCAConfig: DCAConfig = {
  enabled: false,

  symbol: "BTCUSDT",
  quoteAsset: "USDT",

  initialAmountMode: "auto",

  takeProfitPercent: 1,
  stopLossPercent: 0,

  dcaOrders: [
    {
      id: "dca-1",
      percentage: 2,
      amountMode: "auto",
    },
    {
      id: "dca-2",
      percentage: 4,
      amountMode: "auto",
    },
    {
      id: "dca-3",
      percentage: 6,
      amountMode: "auto",
    },
  ],
};
