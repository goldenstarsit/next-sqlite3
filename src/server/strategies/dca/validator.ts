import type { DCAConfig } from "./types";

export function validateDCAConfig(config: DCAConfig): void {
  if (!config.symbol.trim()) {
    throw new Error("Symbol is required.");
  }

  if (!config.quoteAsset.trim()) {
    throw new Error("Quote asset is required.");
  }

  if (
    config.takeProfitPercent < 0 ||
    config.stopLossPercent < 0
  ) {
    throw new Error(
      "Take profit and stop loss cannot be negative.",
    );
  }

  const ids = new Set<string>();

  for (const order of config.dcaOrders) {
    if (ids.has(order.id)) {
      throw new Error(
        `Duplicate DCA order id: ${order.id}`,
      );
    }

    ids.add(order.id);

    if (
      !Number.isFinite(order.percentage) ||
      order.percentage <= 0 ||
      order.percentage >= 100
    ) {
      throw new Error(
        `Invalid DCA percentage for ${order.id}.`,
      );
    }

    if (
      order.amountMode === "fixed" &&
      (!order.amount ||
        !Number.isFinite(order.amount) ||
        order.amount <= 0)
    ) {
      throw new Error(
        `Fixed amount is required for ${order.id}.`,
      );
    }

    if (
      order.amountMode === "balancePercent" &&
      (!order.amount ||
        !Number.isFinite(order.amount) ||
        order.amount <= 0 ||
        order.amount > 100)
    ) {
      throw new Error(
        `Balance percentage must be between 0 and 100 for ${order.id}.`,
      );
    }
  }
}
