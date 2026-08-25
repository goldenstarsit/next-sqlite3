import crypto from "node:crypto";

import type {
  Exchange,
  ExchangeBalance,
  ExchangeCredentials,
  ExchangeOrder,
  ExchangeOrderRequest,
  ExchangeSymbol,
} from "../core/types";

const BASE_URL = "https://api.mexc.com";

interface MexcResponse {
  code?: number;
  msg?: string;
}

interface MexcExchangeInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision?: number;
  quotePrecision?: number;
  quoteAssetPrecision?: number;
  orderTypes?: string[];
  filters?: Array<Record<string, string | number>>;
}

interface MexcAccount {
  balances?: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

interface MexcOrder {
  symbol: string;
  orderId: string;
  origClientOrderId?: string;
  clientOrderId?: string;
  price: string;
  origQty?: string;
  executedQty?: string;
  type: string;
  side: "BUY" | "SELL";
  status: string;
  transactTime?: number;
}

export class MexcExchange implements Exchange {
  readonly id = "mexc";
  readonly name = "MEXC";

  private readonly credentials?: ExchangeCredentials;

  constructor(credentials?: ExchangeCredentials) {
    this.credentials = credentials;
  }

  async ping(): Promise<boolean> {
    const response = await this.request("/api/v3/ping");

    return response.ok;
  }

  async getServerTime(): Promise<number> {
    const response = await this.request("/api/v3/time");

    if (!response.ok) {
      throw await this.error(response);
    }

    const data = await response.json() as { serverTime: number };

    return data.serverTime;
  }

  async getSymbol(symbol: string): Promise<ExchangeSymbol> {
    const response = await this.request(
      `/api/v3/exchangeInfo?symbol=${encodeURIComponent(symbol.toUpperCase())}`,
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    const data = await response.json() as
      | MexcExchangeInfo
      | MexcExchangeInfo[];

    const info = Array.isArray(data) ? data[0] : data;

    if (!info) {
      throw new Error(`MEXC symbol not found: ${symbol}`);
    }

    return {
      symbol: info.symbol,
      baseAsset: info.baseAsset,
      quoteAsset: info.quoteAsset,
      status: info.status,
      baseAssetPrecision: info.baseAssetPrecision,
      quoteAssetPrecision: info.quoteAssetPrecision,
      orderTypes: info.orderTypes ?? [],
      filters: this.parseFilters(info.filters ?? []),
    };
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    const response = await this.signedRequest(
      "GET",
      "/api/v3/account",
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    const data = await response.json() as MexcAccount;

    return (data.balances ?? []).map((balance) => ({
      asset: balance.asset,
      free: Number(balance.free),
      locked: Number(balance.locked),
    }));
  }

  async getBalance(
    asset: string,
  ): Promise<ExchangeBalance | undefined> {
    const balances = await this.getBalances();

    return balances.find(
      (balance) =>
        balance.asset.toUpperCase() === asset.toUpperCase(),
    );
  }

  async getPrice(symbol: string): Promise<number> {
    const response = await this.request(
      `/api/v3/ticker/price?symbol=${encodeURIComponent(symbol.toUpperCase())}`,
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    const data = await response.json() as {
      symbol: string;
      price: string;
    };

    return Number(data.price);
  }

  async createOrder(
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrder> {
    const params: Record<string, string | number> = {
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      type: request.type,
    };

    if (request.quantity !== undefined) {
      params.quantity = request.quantity;
    }

    if (request.quoteOrderQty !== undefined) {
      params.quoteOrderQty = request.quoteOrderQty;
    }

    if (request.price !== undefined) {
      params.price = request.price;
    }

    if (request.clientOrderId) {
      params.newClientOrderId = request.clientOrderId;
    }

    const response = await this.signedRequest(
      "POST",
      "/api/v3/order",
      params,
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    return this.normalizeOrder(
      await response.json() as MexcOrder,
    );
  }

  async getOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder> {
    const response = await this.signedRequest(
      "GET",
      "/api/v3/order",
      {
        symbol: symbol.toUpperCase(),
        orderId,
      },
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    return this.normalizeOrder(
      await response.json() as MexcOrder,
    );
  }

  async cancelOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder> {
    const response = await this.signedRequest(
      "DELETE",
      "/api/v3/order",
      {
        symbol: symbol.toUpperCase(),
        orderId,
      },
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    return this.normalizeOrder(
      await response.json() as MexcOrder,
    );
  }

  close(): void {
    // REST client does not hold persistent resources.
  }

  private parseFilters(
    filters: Array<Record<string, string | number>>,
  ) {
    const result: {
      minQty?: number;
      maxQty?: number;
      stepSize?: number;
      minNotional?: number;
      tickSize?: number;
      minPrice?: number;
      maxPrice?: number;
    } = {};

    for (const filter of filters) {
      const type = String(
        filter.filterType ?? filter.type ?? "",
      ).toUpperCase();

      if (type.includes("LOT")) {
        if (filter.minQty !== undefined) {
          result.minQty = Number(filter.minQty);
        }

        if (filter.maxQty !== undefined) {
          result.maxQty = Number(filter.maxQty);
        }

        if (filter.stepSize !== undefined) {
          result.stepSize = Number(filter.stepSize);
        }
      }

      if (
        type.includes("NOTIONAL") ||
        type.includes("MIN_NOTIONAL")
      ) {
        if (filter.minNotional !== undefined) {
          result.minNotional = Number(filter.minNotional);
        }
      }

      if (type.includes("PRICE")) {
        if (filter.minPrice !== undefined) {
          result.minPrice = Number(filter.minPrice);
        }

        if (filter.maxPrice !== undefined) {
          result.maxPrice = Number(filter.maxPrice);
        }

        if (filter.tickSize !== undefined) {
          result.tickSize = Number(filter.tickSize);
        }
      }
    }

    return result;
  }

  private normalizeOrder(order: MexcOrder): ExchangeOrder {
    return {
      symbol: order.symbol,
      orderId: order.orderId,
      clientOrderId:
        order.clientOrderId ?? order.origClientOrderId,
      side: order.side,
      type: order.type as ExchangeOrder["type"],
      status: order.status,
      price: Number(order.price),
      originalQuantity: Number(order.origQty ?? 0),
      executedQuantity: Number(order.executedQty ?? 0),
      transactTime: order.transactTime,
    };
  }

  private async signedRequest(
    method: string,
    path: string,
    parameters: Record<string, string | number> = {},
  ): Promise<Response> {
    if (!this.credentials) {
      throw new Error(
        "MEXC credentials are required for this operation.",
      );
    }

    const params = {
      ...parameters,
      timestamp: Date.now(),
    };

    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      query.set(key, String(value));
    }

    const signature = crypto
      .createHmac("sha256", this.credentials.apiSecret)
      .update(query.toString())
      .digest("hex");

    query.set("signature", signature);

    return fetch(
      `${BASE_URL}${path}?${query.toString()}`,
      {
        method,
        headers: {
          "X-MEXC-APIKEY": this.credentials.apiKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
  }

  private async request(
    path: string,
  ): Promise<Response> {
    return fetch(`${BASE_URL}${path}`, {
      method: "GET",
      cache: "no-store",
    });
  }

  private async error(
    response: Response,
  ): Promise<Error> {
    let message = `MEXC API error: HTTP ${response.status}`;

    try {
      const data = await response.json() as MexcResponse;

      if (data.msg) {
        message += ` - ${data.msg}`;
      }

      if (data.code !== undefined) {
        message += ` (${data.code})`;
      }
    } catch {
      // Keep HTTP error if response is not JSON.
    }

    return new Error(message);
  }
}
