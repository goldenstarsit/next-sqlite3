import { StrategyRegistry } from "./core/StrategyRegistry";
import { StrategyManager } from "./core/StrategyManager";
import { DCAStrategy } from "./dca";

const registry = new StrategyRegistry();

registry.register(
  new DCAStrategy(),
);

export const strategyManager =
  new StrategyManager(registry);

export { registry };
