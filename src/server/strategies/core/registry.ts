import type {
  TradingStrategy,
} from "./types";

import {
  createDcaStrategy,
} from "../dca";

import {
  createGridStrategy,
} from "../grid";

import {
  createRotationStrategy,
} from "../rotation";

export type StrategyId =
  | "dca"
  | "grid"
  | "rotation";

export type StrategyConfig =
  Record<string, unknown>;

export function createStrategy(
  id: StrategyId,
  config?: StrategyConfig,
): TradingStrategy {
  switch (id) {
    case "dca":
      return createDcaStrategy(
        config,
      );

    case "grid":
      return createGridStrategy(
        config,
      );

    case "rotation":
      return createRotationStrategy(
        config,
      );

    default:
      throw new Error(
        `Unsupported strategy: ${id}`,
      );
  }
}

export function getAvailableStrategies():
  StrategyId[] {
  return [
    "dca",
    "grid",
    "rotation",
  ];
}
