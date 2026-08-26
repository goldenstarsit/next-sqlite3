export type StrategyAmountMode =
  | "ABSOLUTE"
  | "PERCENTAGE";

export interface StrategyAmount {
  value: number;
  mode: StrategyAmountMode;
}

export function absoluteAmount(
  value: number,
): StrategyAmount {
  return {
    value,
    mode: "ABSOLUTE",
  };
}

export function percentageAmount(
  value: number,
): StrategyAmount {
  return {
    value,
    mode: "PERCENTAGE",
  };
}
