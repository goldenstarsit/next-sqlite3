import type {
  DcaConfig,
} from "./DcaConfig";

import {
  DcaEngine,
} from "./DcaEngine";

export class DcaPlugin {
  readonly id = "dca";
  readonly name = "DCA";

  private config: DcaConfig;
  private engine: DcaEngine;

  constructor(
    config: DcaConfig,
  ) {
    this.validateConfig(config);

    this.config =
      structuredClone(config);

    this.engine =
      new DcaEngine(this.config);
  }

  getConfig(): DcaConfig {
    return structuredClone(
      this.config,
    );
  }

  getEngine(): DcaEngine {
    return this.engine;
  }

  updateConfig(
    config: DcaConfig,
  ): void {
    this.validateConfig(config);

    this.config =
      structuredClone(config);

    this.engine =
      new DcaEngine(this.config);
  }

  validateConfig(
    config: DcaConfig,
  ): void {
    if (
      !config.symbol &&
      config.orders.length === 0
    ) {
      throw new Error(
        "DCA configuration is invalid.",
      );
    }

    if (
      config.orderCount !== undefined &&
      (
        !Number.isInteger(
          config.orderCount,
        ) ||
        config.orderCount < 0
      )
    ) {
      throw new Error(
        "DCA orderCount must be a non-negative integer.",
      );
    }

    if (
      config.orderCount !== undefined &&
      config.orders.length !==
        config.orderCount
    ) {
      throw new Error(
        "DCA orderCount must match orders length.",
      );
    }

    for (
      let index = 0;
      index < config.orders.length;
      index++
    ) {
      const order =
        config.orders[index];

      const percentage =
        order.percentage ??
        order.percentageFromInitialEntry;

      if (
        percentage === undefined ||
        !Number.isFinite(
          percentage,
        ) ||
        percentage <= 0 ||
        percentage >= 100
      ) {
        throw new Error(
          `Invalid DCA percentage for order ${
            order.id ?? index + 1
          }.`,
        );
      }
    }
  }
}

export default DcaPlugin;
