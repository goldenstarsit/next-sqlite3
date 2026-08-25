import type { Strategy } from "./types";

export class StrategyRegistry {
  private readonly strategies = new Map<string, Strategy>();

  register(strategy: Strategy): void {
    if (this.strategies.has(strategy.manifest.id)) {
      throw new Error(
        `Strategy already registered: ${strategy.manifest.id}`,
      );
    }

    this.strategies.set(
      strategy.manifest.id,
      strategy,
    );
  }

  get(id: string): Strategy {
    const strategy = this.strategies.get(id);

    if (!strategy) {
      throw new Error(`Strategy not found: ${id}`);
    }

    return strategy;
  }

  list(): Strategy[] {
    return [...this.strategies.values()];
  }
}
