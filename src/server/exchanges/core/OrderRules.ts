import type {
  SymbolFilter,
  ExchangeOrderRequest,
} from "./types";

export interface OrderRuleSet {
  symbol: string;
  filters: SymbolFilter;
}

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const text = value.toString();

  if (text.includes("e-")) {
    const [, exponent] = text.split("e-");
    return Number(exponent) || 0;
  }

  return text.includes(".")
    ? text.split(".")[1]?.length ?? 0
    : 0;
}

function floorToStep(
  value: number,
  step: number,
): number {
  if (step <= 0) {
    return value;
  }

  const precision =
    decimalPlaces(step) + 8;

  const normalized =
    Math.floor(
      (value + Number.EPSILON) / step,
    ) * step;

  return Number(
    normalized.toFixed(precision),
  );
}

function ceilToStep(
  value: number,
  step: number,
): number {
  if (step <= 0) {
    return value;
  }

  const precision =
    decimalPlaces(step) + 8;

  const normalized =
    Math.ceil(
      (value - Number.EPSILON) / step,
    ) * step;

  return Number(
    normalized.toFixed(precision),
  );
}

function roundToTick(
  value: number,
  tick: number,
): number {
  if (tick <= 0) {
    return value;
  }

  const precision =
    decimalPlaces(tick) + 8;

  const normalized =
    Math.round(
      (value + Number.EPSILON) / tick,
    ) * tick;

  return Number(
    normalized.toFixed(precision),
  );
}

export function normalizeStep(
  value: number,
  step: number,
): number {
  return floorToStep(value, step);
}

export function normalizePrice(
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

  const tickSize =
    rules.filters.tickSize ?? 0;

  let result =
    floorToStep(price, tickSize);

  const minPrice =
    rules.filters.minPrice;

  const maxPrice =
    rules.filters.maxPrice;

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
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Order quantity must be greater than zero.",
    );
  }

  const stepSize =
    rules.filters.stepSize ?? 0;

  let result =
    floorToStep(quantity, stepSize);

  const minQty =
    rules.filters.minQty;

  const maxQty =
    rules.filters.maxQty;

  if (
    minQty !== undefined &&
    result < minQty
  ) {
    result = ceilToStep(minQty, stepSize);
  }

  if (
    maxQty !== undefined &&
    result > maxQty
  ) {
    result = maxQty;
  }

  if (result <= 0) {
    throw new Error(
      "Order quantity becomes zero after step-size normalization.",
    );
  }

  return result;
}

export function normalizeMarketQuantity(
  quantity: number,
  rules: OrderRuleSet,
): number {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Order quantity must be greater than zero.",
    );
  }

  const filter = rules.filters;

  const step =
    filter.marketStepSize ??
    filter.stepSize ??
    0;

  let result =
    floorToStep(quantity, step);

  const minQty =
    filter.marketMinQty ??
    filter.minQty;

  const maxQty =
    filter.marketMaxQty ??
    filter.maxQty;

  if (
    minQty !== undefined &&
    result < minQty
  ) {
    result = ceilToStep(minQty, step);
  }

  if (
    maxQty !== undefined &&
    result > maxQty
  ) {
    result = maxQty;
  }

  if (result <= 0) {
    throw new Error(
      "Order quantity becomes zero after market step-size normalization.",
    );
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

  const filter = rules.filters;

  const step =
    filter.stepSize ?? 0;

  let quantity =
    filter.minQty ?? 0;

  if (
    filter.minNotional !== undefined &&
    filter.minNotional > 0
  ) {
    quantity = Math.max(
      quantity,
      filter.minNotional / price,
    );
  }

  quantity =
    ceilToStep(quantity, step);

  if (
    filter.minNotional !== undefined &&
    quantity * price <
      filter.minNotional
  ) {
    quantity =
      ceilToStep(
        filter.minNotional / price,
        step,
      );
  }

  if (
    filter.maxQty !== undefined &&
    quantity > filter.maxQty
  ) {
    throw new Error(
      "Minimum order quantity exceeds exchange maximum quantity.",
    );
  }

  return quantity;
}

export function calculateMinimumMarketQuantity(
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

  const filter = rules.filters;

  const step =
    filter.marketStepSize ??
    filter.stepSize ??
    0;

  const minQty =
    filter.marketMinQty ??
    filter.minQty ??
    0;

  const minNotionalApplies =
    filter.applyMinNotionalToMarket !== false;

  let quantity = minQty;

  if (
    minNotionalApplies &&
    filter.minNotional !== undefined &&
    filter.minNotional > 0
  ) {
    quantity = Math.max(
      quantity,
      filter.minNotional / price,
    );
  }

  quantity =
    ceilToStep(quantity, step);

  if (
    minNotionalApplies &&
    filter.minNotional !== undefined &&
    quantity * price <
      filter.minNotional
  ) {
    quantity =
      ceilToStep(
        filter.minNotional / price,
        step,
      );
  }

  const maxQty =
    filter.marketMaxQty ??
    filter.maxQty;

  if (
    maxQty !== undefined &&
    quantity > maxQty
  ) {
    throw new Error(
      "Minimum market order quantity exceeds exchange maximum quantity.",
    );
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
    throw new Error(
      "Order symbol is required.",
    );
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

export function normalizeOrderQuantity(
  quantity: number,
  filter: SymbolFilter,
): number {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Order quantity must be greater than zero.",
    );
  }

  let normalized =
    floorToStep(
      quantity,
      filter.stepSize ?? 0,
    );

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
  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    throw new Error(
      "Order price must be greater than zero.",
    );
  }

  let normalized =
    roundToTick(
      price,
      filter.tickSize ?? 0,
    );

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
  options: {
    market?: boolean;
  } = {},
): void {
  const market =
    options.market === true;

  if (
    market &&
    filter.applyMinNotionalToMarket === false
  ) {
    return;
  }

  if (
    filter.minNotional !== undefined
  ) {
    const notional =
      quantity * price;

    if (
      notional <
      filter.minNotional
    ) {
      throw new Error(
        `Order notional is below minimum notional: ${filter.minNotional}`,
      );
    }
  }

  if (
    market &&
    filter.applyMaxNotionalToMarket === false
  ) {
    return;
  }

  if (
    filter.maxNotional !== undefined
  ) {
    const notional =
      quantity * price;

    if (
      notional >
      filter.maxNotional
    ) {
      throw new Error(
        `Order notional exceeds maximum notional: ${filter.maxNotional}`,
      );
    }
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
    clientOrderId:
      request.clientOrderId,
  };

  const isMarket =
    request.type === "MARKET";

  if (request.quantity !== undefined) {
    prepared.quantity =
      isMarket
        ? normalizeMarketQuantity(
            request.quantity,
            {
              symbol: request.symbol,
              filters: filter,
            },
          )
        : normalizeOrderQuantity(
            request.quantity,
            filter,
          );
  }

  if (
    request.quoteOrderQty !== undefined
  ) {
    prepared.quoteOrderQty =
      request.quoteOrderQty;

    if (
      isMarket &&
      filter.minNotional !== undefined &&
      filter.applyMinNotionalToMarket !== false &&
      prepared.quoteOrderQty <
        filter.minNotional
    ) {
      throw new Error(
        `Order quote amount is below minimum notional: ${filter.minNotional}`,
      );
    }

    if (
      isMarket &&
      filter.maxNotional !== undefined &&
      filter.applyMaxNotionalToMarket !== false &&
      prepared.quoteOrderQty >
        filter.maxNotional
    ) {
      throw new Error(
        `Order quote amount exceeds maximum notional: ${filter.maxNotional}`,
      );
    }
  }

  if (request.price !== undefined) {
    prepared.price =
      normalizeOrderPrice(
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
      {
        market: isMarket,
      },
    );
  }

  return prepared;
}
