import type { StrategyContext } from "./types";
import { StrategyRegistry } from "./StrategyRegistry";

export class StrategyManager {
  constructor(
    private readonly registry: StrategyRegistry,
  ) {}

  async start(
    strategyId: string,
  ): Promise<void> {
    const strategy =
      this.registry.get(strategyId);

    const context: StrategyContext = {
      now: new Date(),
    };

    await strategy.start(context);
  }

  async stop(
    strategyId: string,
  ): Promise<void> {
    const strategy =
      this.registry.get(strategyId);

    await strategy.stop();
  }

  getStatus(strategyId: string) {
    return this.registry
      .get(strategyId)
      .getStatus();
  }
}
