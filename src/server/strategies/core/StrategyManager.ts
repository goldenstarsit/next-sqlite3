import type {
  StrategyContext,
} from "./types";

import {
  StrategyRegistry,
} from "./StrategyRegistry";

export class StrategyManager {
  constructor(
    private readonly registry: StrategyRegistry,
  ) {}

  calculateOrders(
    strategyId: string,
    context: StrategyContext,
  ) {
    return this.registry
      .get(strategyId)
      .calculateOrders(context);
  }

  getConfig(strategyId: string) {
    return this.registry
      .get(strategyId)
      .getConfig();
  }

  updateConfig(
    strategyId: string,
    config: unknown,
  ): void {
    const strategy =
      this.registry.get(strategyId);

    strategy.updateConfig(config);
  }

  getStatus(strategyId: string) {
    const strategy =
      this.registry.get(strategyId);

    return {
      id: strategy.id,
      name: strategy.name,
      config: strategy.getConfig(),
    };
  }
}
