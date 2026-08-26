import type {
  StrategyContext,
  StrategyOrder,
  TradingStrategy,
} from "../core/types";

import type {
  RotationConfig,
} from "./RotationConfig";

import {
  RotationEngine,
} from "./RotationEngine";

import {
  defaultRotationConfig,
} from "./defaultConfig";

export class RotationStrategy
  implements TradingStrategy<RotationConfig>
{
  readonly id = "rotation";
  readonly name = "Rotation";

  private config: RotationConfig;

  readonly engine: RotationEngine;

  constructor(
    config?: Partial<RotationConfig>,
  ) {
    this.config = {
      ...defaultRotationConfig,
      ...config,
      symbols:
        config?.symbols ??
        defaultRotationConfig.symbols,
      sampleWindows:
        config?.sampleWindows ??
        defaultRotationConfig.sampleWindows,
    };

    this.validateConfig(this.config);

    this.engine =
      new RotationEngine(this.config);
  }

  getConfig(): RotationConfig {
    return structuredClone(this.config);
  }

  updateConfig(
    config: RotationConfig,
  ): void {
    this.validateConfig(config);

    this.config =
      structuredClone(config);

    this.engine.updateConfig(
      this.config,
    );
  }

  validateConfig(
    config: RotationConfig,
  ): void {
    if (!Array.isArray(config.symbols)) {
      throw new Error(
        "Rotation symbols must be an array.",
      );
    }

    if (
      !Number.isFinite(
        config.takeProfitPercent,
      ) ||
      config.takeProfitPercent <= 0
    ) {
      throw new Error(
        "Rotation take profit must be greater than zero.",
      );
    }

    if (
      !Number.isFinite(
        config.maxDurationSeconds,
      ) ||
      config.maxDurationSeconds <= 0
    ) {
      throw new Error(
        "Rotation max duration must be greater than zero.",
      );
    }

    if (
      config.variationWeight < 0 ||
      config.takeProfitProbabilityWeight < 0
    ) {
      throw new Error(
        "Rotation weights cannot be negative.",
      );
    }
  }

  calculateOrders(
    _context: StrategyContext,
  ): StrategyOrder[] {
    if (!this.config.enabled) {
      return [];
    }

    const candidate =
      this.engine.getCandidate();

    if (!candidate) {
      return [];
    }

    return [
      {
        symbol: candidate.symbol,
        side: "BUY",
        reason:
          `Rotation candidate ${candidate.symbol}; ` +
          `score=${candidate.score.toFixed(6)}, ` +
          `variation=${candidate.variationPercent.toFixed(4)}%, ` +
          `TP probability=${candidate.takeProfitProbability.toFixed(4)}`,
      },
    ];
  }
}

export function createRotationStrategy(
  config?: Record<string, unknown>,
): RotationStrategy {
  return new RotationStrategy(
    config as Partial<RotationConfig> | undefined,
  );
}
