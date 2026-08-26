export interface GridConfig {
  enabled: boolean;

  lowerPrice: number;
  upperPrice: number;

  gridCount: number;

  orderAmountPercentage: number;

  minimumOrderMode:
    | "exchange-minimum"
    | "fixed";

  minimumOrderAmount?: number;
}
