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

function decimals(value: number): number {
  const text = value.toString();

  if (!text.includes(".")) {
    return 0;
  }

  return text.split(".")[1]?.length ?? 0;
}

export function normalizeStep(
  value: number,
  step: number,
): number {
  if (step <= 0) {
    return value;
  }

  const precision = decimals(step);

  const normalized =
    Math.floor((value + Number.EPSILON) / step) * step;

  return Number(normalized.toFixed(precision));
}

export function normalizePrice(
  price: number,
  filters: BinanceSymbolFilters,
): number {
  const normalized = normalizeStep(
    price,
    filters.price.tickSize,
  );

  return Math.min(
    Math.max(normalized, filters.price.minPrice),
    filters.price.maxPrice,
  );
}

export function normalizeQuantity(
  quantity: number,
  filters: BinanceSymbolFilters,
): number {
  const normalized = normalizeStep(
    quantity,
    filters.lotSize.stepSize,
  );

  return Math.min(
    Math.max(normalized, filters.lotSize.minQty),
    filters.lotSize.maxQty,
  );
}

/**
 * Calculates the minimum valid quantity according to
 * LOT_SIZE and MIN_NOTIONAL/NOTIONAL.
 */
export function calculateMinimumQuantity(
  price: number,
  filters: BinanceSymbolFilters,
): number {
  let quantity = filters.lotSize.minQty;

  if (filters.notional) {
    const notionalQuantity =
      filters.notional.minNotional / price;

    quantity = Math.max(
      quantity,
      notionalQuantity,
    );
  }

  quantity = normalizeQuantity(
    quantity,
    filters,
  );

  /**
   * Rounding down can still leave the order below
   * minimum notional, so move one step upward.
   */
  if (
    filters.notional &&
    quantity * price < filters.notional.minNotional
  ) {
    quantity = normalizeQuantity(
      quantity + filters.lotSize.stepSize,
      filters,
    );
  }

  return quantity;
}

export function calculateMinimumOrderAmount(
  price: number,
  filters: BinanceSymbolFilters,
): number {
  const quantity = calculateMinimumQuantity(
    price,
    filters,
  );

  return quantity * price;
}
