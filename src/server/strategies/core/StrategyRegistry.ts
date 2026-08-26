import type { TradingStrategy } from "./types";

export class StrategyRegistry {
  private readonly strategies =
    new Map<string, TradingStrategy>();

  register(strategy: TradingStrategy): void {
    if (this.strategies.has(strategy.id)) {
      throw new Error(
        `Strategy already registered: ${strategy.id}`,
      );
    }

    this.strategies.set(
      strategy.id,
      strategy,
    );
  }

  get(id: string): TradingStrategy {
    const strategy =
      this.strategies.get(id);

    if (!strategy) {
      throw new Error(
        `Strategy not found: ${id}`,
      );
    }

    return strategy;
  }

  has(id: string): boolean {
    return this.strategies.has(id);
  }

  list(): TradingStrategy[] {
    return [...this.strategies.values()];
  }
}
