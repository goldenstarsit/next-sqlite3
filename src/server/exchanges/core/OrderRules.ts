import type {
  SymbolFilter,
  ExchangeOrderRequest,
} from "./types";

export interface OrderRuleSet {
  symbol: string;
  filters: SymbolFilter;
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
    Math.floor(
      (value + Number.EPSILON) / step,
    ) * step;

  return Number(
    normalized.toFixed(precision),
  );
}

export function normalizePrice(
  price: number,
  rules: OrderRuleSet,
): number {
  const tickSize =
    rules.filters.tickSize ?? 0;

  if (tickSize <= 0) {
    return price;
  }

  const normalized =
    normalizeStep(price, tickSize);

  const minPrice =
    rules.filters.minPrice;

  const maxPrice =
    rules.filters.maxPrice;

  let result = normalized;

  if (
    minPrice !== undefined &&
    result < minPrice
  ) {
    result = minPrice;
  }

  if (
    maxPrice !== undefined &&
    result > maxPrice
  ) {
    result = maxPrice;
  }

  return result;
}

export function normalizeQuantity(
  quantity: number,
  rules: OrderRuleSet,
): number {
  const stepSize =
    rules.filters.stepSize ?? 0;

  if (stepSize <= 0) {
    return quantity;
  }

  const normalized =
    normalizeStep(
      quantity,
      stepSize,
    );

  const minQty =
    rules.filters.minQty;

  const maxQty =
    rules.filters.maxQty;

  let result = normalized;

  if (
    minQty !== undefined &&
    result < minQty
  ) {
    result = minQty;
  }

  if (
    maxQty !== undefined &&
    result > maxQty
  ) {
    result = maxQty;
  }

  return result;
}

export function calculateMinimumQuantity(
  price: number,
  rules: OrderRuleSet,
): number {
  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    throw new Error(
      "Order price must be greater than zero.",
    );
  }

  let quantity =
    rules.filters.minQty ?? 0;

  const minNotional =
    rules.filters.minNotional;

  if (
    minNotional !== undefined &&
    minNotional > 0
  ) {
    quantity = Math.max(
      quantity,
      minNotional / price,
    );
  }

  quantity =
    normalizeQuantity(
      quantity,
      rules,
    );

  if (
    minNotional !== undefined &&
    quantity * price < minNotional
  ) {
    const stepSize =
      rules.filters.stepSize ?? 0;

    if (stepSize > 0) {
      quantity =
        normalizeQuantity(
          quantity + stepSize,
          rules,
        );
    }
  }

  return quantity;
}

export function calculateMinimumOrderAmount(
  price: number,
  rules: OrderRuleSet,
): number {
  return (
    calculateMinimumQuantity(
      price,
      rules,
    ) * price
  );
}


export function validateOrderRequest(
  request: ExchangeOrderRequest,
): void {
  if (!request.symbol.trim()) {
    throw new Error("Order symbol is required.");
  }

  if (
    request.side !== "BUY" &&
    request.side !== "SELL"
  ) {
    throw new Error(
      `Unsupported order side: ${request.side}`,
    );
  }

  if (
    request.type !== "MARKET" &&
    request.type !== "LIMIT" &&
    request.type !== "LIMIT_MAKER"
  ) {
    throw new Error(
      `Unsupported order type: ${request.type}`,
    );
  }

  const hasQuantity =
    request.quantity !== undefined;

  const hasQuoteOrderQty =
    request.quoteOrderQty !== undefined;

  if (
    hasQuantity &&
    hasQuoteOrderQty
  ) {
    throw new Error(
      "quantity and quoteOrderQty cannot be used together.",
    );
  }

  if (
    !hasQuantity &&
    !hasQuoteOrderQty
  ) {
    throw new Error(
      "Either quantity or quoteOrderQty is required.",
    );
  }

  if (
    hasQuantity &&
    (
      !Number.isFinite(request.quantity!) ||
      request.quantity! <= 0
    )
  ) {
    throw new Error(
      "Order quantity must be greater than zero.",
    );
  }

  if (
    hasQuoteOrderQty &&
    (
      !Number.isFinite(request.quoteOrderQty!) ||
      request.quoteOrderQty! <= 0
    )
  ) {
    throw new Error(
      "Order quote amount must be greater than zero.",
    );
  }

  if (
    request.type === "LIMIT" ||
    request.type === "LIMIT_MAKER"
  ) {
    if (
      request.price === undefined ||
      !Number.isFinite(request.price) ||
      request.price <= 0
    ) {
      throw new Error(
        "Limit orders require a price greater than zero.",
      );
    }

    if (hasQuoteOrderQty) {
      throw new Error(
        "Limit orders require quantity, not quoteOrderQty.",
      );
    }
  }

  if (
    request.type === "MARKET" &&
    request.price !== undefined
  ) {
    throw new Error(
      "Market orders must not specify a price.",
    );
  }

  if (
    request.type === "LIMIT_MAKER" &&
    request.side !== "BUY" &&
    request.side !== "SELL"
  ) {
    throw new Error(
      "LIMIT_MAKER requires a valid order side.",
    );
  }
}

export interface PreparedOrder {
  symbol: string;
  side: ExchangeOrderRequest["side"];
  type: ExchangeOrderRequest["type"];
  quantity?: number;
  quoteOrderQty?: number;
  price?: number;
  clientOrderId?: string;
}

function floorToStep(value: number, step: number): number {
  if (step <= 0) return value;

  const precision = Math.max(
    0,
    Math.ceil(-Math.log10(step)) + 8,
  );

  const result =
    Math.floor((value + Number.EPSILON) / step) * step;

  return Number(result.toFixed(precision));
}

function roundToTick(value: number, tick: number): number {
  if (tick <= 0) return value;

  const precision = Math.max(
    0,
    Math.ceil(-Math.log10(tick)) + 8,
  );

  const result =
    Math.round((value + Number.EPSILON) / tick) * tick;

  return Number(result.toFixed(precision));
}

export function normalizeOrderQuantity(
  quantity: number,
  filter: SymbolFilter,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(
      "Order quantity must be greater than zero.",
    );
  }

  let normalized = quantity;

  if (filter.stepSize !== undefined) {
    normalized = floorToStep(
      normalized,
      filter.stepSize,
    );
  }

  if (
    filter.minQty !== undefined &&
    normalized < filter.minQty
  ) {
    throw new Error(
      `Order quantity is below minimum quantity: ${filter.minQty}`,
    );
  }

  if (
    filter.maxQty !== undefined &&
    normalized > filter.maxQty
  ) {
    throw new Error(
      `Order quantity exceeds maximum quantity: ${filter.maxQty}`,
    );
  }

  if (normalized <= 0) {
    throw new Error(
      "Order quantity becomes zero after step-size normalization.",
    );
  }

  return normalized;
}

export function normalizeOrderPrice(
  price: number,
  filter: SymbolFilter,
): number {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(
      "Order price must be greater than zero.",
    );
  }

  let normalized = price;

  if (filter.tickSize !== undefined) {
    normalized = roundToTick(
      normalized,
      filter.tickSize,
    );
  }

  if (
    filter.minPrice !== undefined &&
    normalized < filter.minPrice
  ) {
    throw new Error(
      `Order price is below minimum price: ${filter.minPrice}`,
    );
  }

  if (
    filter.maxPrice !== undefined &&
    normalized > filter.maxPrice
  ) {
    throw new Error(
      `Order price exceeds maximum price: ${filter.maxPrice}`,
    );
  }

  if (normalized <= 0) {
    throw new Error(
      "Order price becomes zero after tick-size normalization.",
    );
  }

  return normalized;
}

export function validateOrderNotional(
  quantity: number,
  price: number,
  filter: SymbolFilter,
): void {
  if (filter.minNotional === undefined) {
    return;
  }

  const notional = quantity * price;

  if (notional < filter.minNotional) {
    throw new Error(
      `Order notional is below minimum notional: ${filter.minNotional}`,
    );
  }
}

export function prepareOrder(
  request: ExchangeOrderRequest,
  filter: SymbolFilter,
): PreparedOrder {
  validateOrderRequest(request);

  const prepared: PreparedOrder = {
    symbol: request.symbol,
    side: request.side,
    type: request.type,
    clientOrderId: request.clientOrderId,
  };

  if (request.quantity !== undefined) {
    prepared.quantity = normalizeOrderQuantity(
      request.quantity,
      filter,
    );
  }

  if (request.quoteOrderQty !== undefined) {
    prepared.quoteOrderQty = request.quoteOrderQty;
  }

  if (request.price !== undefined) {
    prepared.price = normalizeOrderPrice(
      request.price,
      filter,
    );
  }

  if (
    prepared.quantity !== undefined &&
    prepared.price !== undefined
  ) {
    validateOrderNotional(
      prepared.quantity,
      prepared.price,
      filter,
    );
  }

  return prepared;
}
