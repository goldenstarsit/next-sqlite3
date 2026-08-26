import type {
  DcaConfig,
} from "./DcaConfig";

export const defaultDcaConfig: DcaConfig = {
  enabled: false,

  orders: [
    {
      percentageFromInitialEntry: 2,
      amountPercentage: 100,
    },
    {
      percentageFromInitialEntry: 5,
      amountPercentage: 100,
    },
    {
      percentageFromInitialEntry: 10,
      amountPercentage: 100,
    },
  ],

  defaultAmountPercentage: 100,

  minimumOrderMode:
    "exchange-minimum",
};
