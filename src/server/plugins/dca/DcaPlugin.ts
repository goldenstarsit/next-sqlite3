import type { DcaConfig } from "./DcaConfig";
import { DcaEngine } from "./DcaEngine";

export class DcaPlugin {
  readonly name = "dca";

  private engine: DcaEngine;

  constructor(
    private config: DcaConfig,
  ) {
    this.engine = new DcaEngine(config);
  }

  getConfig(): DcaConfig {
    return structuredClone(this.config);
  }

  updateConfig(
    config: DcaConfig,
  ): void {
    this.validateConfig(config);

    this.config = config;
    this.engine = new DcaEngine(config);
  }

  getEngine(): DcaEngine {
    return this.engine;
  }

  private validateConfig(
    config: DcaConfig,
  ): void {
    if (!config.symbol) {
      throw new Error(
        "DCA symbol is required.",
      );
    }

    if (
      !Number.isInteger(config.orderCount) ||
      config.orderCount < 0
    ) {
      throw new Error(
        "DCA orderCount must be a non-negative integer.",
      );
    }

    if (
      config.orders.length !== config.orderCount
    ) {
      throw new Error(
        "DCA orderCount must match orders length.",
      );
    }

    for (const order of config.orders) {
      if (
        !Number.isFinite(order.percentage) ||
        order.percentage <= 0 ||
        order.percentage >= 100
      ) {
        throw new Error(
          `Invalid DCA percentage for order ${order.id}.`,
        );
      }
    }
  }
}
