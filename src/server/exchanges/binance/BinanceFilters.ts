import type {
  OrderRuleSet,
} from "../core/OrderRules";

import {
  calculateMinimumOrderAmount as calculateCoreMinimumOrderAmount,
  calculateMinimumQuantity as calculateCoreMinimumQuantity,
  normalizePrice as normalizeCorePrice,
  normalizeQuantity as normalizeCoreQuantity,
  normalizeStep,
} from "../core/OrderRules";

export interface PriceFilter {
  minPrice: number;
  maxPrice: number;
  tickSize: number;
}

export interface LotSizeFilter {
  minQty: number;
  maxQty: number;
  stepSize: number;
}

export interface NotionalFilter {
  minNotional: number;
  applyToMarket?: boolean;
}

export interface BinanceSymbolFilters {
  symbol: string;
  price: PriceFilter;
  lotSize: LotSizeFilter;
  notional?: NotionalFilter;
}

function toRules(
  filters: BinanceSymbolFilters,
): OrderRuleSet {
  return {
    symbol: filters.symbol,
    filters: {
      minQty: filters.lotSize.minQty,
      maxQty: filters.lotSize.maxQty,
      stepSize: filters.lotSize.stepSize,
      minNotional:
        filters.notional?.minNotional,
      tickSize: filters.price.tickSize,
      minPrice: filters.price.minPrice,
      maxPrice: filters.price.maxPrice,
    },
  };
}

export {
  normalizeStep,
};

export function normalizePrice(
  price: number,
  filters: BinanceSymbolFilters,
): number {
  return normalizeCorePrice(
    price,
    toRules(filters),
  );
}

export function normalizeQuantity(
  quantity: number,
  filters: BinanceSymbolFilters,
): number {
  return normalizeCoreQuantity(
    quantity,
    toRules(filters),
  );
}

export function calculateMinimumQuantity(
  price: number,
  filters: BinanceSymbolFilters,
): number {
  return calculateCoreMinimumQuantity(
    price,
    toRules(filters),
  );
}

export function calculateMinimumOrderAmount(
  price: number,
  filters: BinanceSymbolFilters,
): number {
  return calculateCoreMinimumOrderAmount(
    price,
    toRules(filters),
  );
}
