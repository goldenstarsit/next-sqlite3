import crypto from "node:crypto";

import { normalizeOrderStatus } from "../core/types";
import type {
  Exchange,
  ExchangeBalance,
  ExchangeCredentials,
  ExchangeOrder,
  ExchangeOrderRequest,
  ExchangeSymbol,
  SymbolFilter,
} from "../core/types";

const BASE_URL = "https://api.bybit.com";
const RECV_WINDOW = "5000";

interface BybitResponse<T = unknown> {
  retCode: number;
  retMsg: string;
  result?: T;
  time?: number;
}

interface BybitInstrument {
  symbol: string;
  status: string;
  baseCoin: string;
  quoteCoin: string;
  basePrecision?: string;
  quotePrecision?: string;
  priceFilter?: {
    tickSize?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  lotSizeFilter?: {
    basePrecision?: string;
    quotePrecision?: string;
    minOrderQty?: string;
    maxOrderQty?: string;
    minOrderAmt?: string;
    maxOrderAmt?: string;
    qtyStep?: string;
  };
}

interface BybitTicker {
  symbol: string;
  lastPrice: string;
}

interface BybitWalletCoin {
  coin: string;
  walletBalance: string;
  availableToWithdraw?: string;
  locked?: string;
  free?: string;
  equity?: string;
}

interface BybitWalletAccount {
  coin?: BybitWalletCoin[];
}

interface BybitOrder {
  orderId: string;
  orderLinkId?: string;
  symbol: string;
  orderStatus: string;
  price: string;
  qty: string;
  cumExecQty?: string;
  side: "Buy" | "Sell";
  orderType: "Market" | "Limit";
  createdTime?: string;
  updatedTime?: string;
}

export class BybitExchange implements Exchange {
  readonly id = "bybit";
  readonly name = "Bybit";

  private readonly credentials?: ExchangeCredentials;

  constructor(credentials?: ExchangeCredentials) {
    this.credentials = credentials;
  }

  async ping(): Promise<boolean> {
    const response = await this.request(
      "/v5/market/time",
    );

    return response.ok;
  }

  async getServerTime(): Promise<number> {
    const response = await this.request(
      "/v5/market/time",
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    const data =
      await response.json() as BybitResponse<{
        timeSecond?: string;
        timeNano?: string;
      }>;

    if (data.retCode !== 0) {
      throw new Error(
        `Bybit API error: ${data.retMsg} (${data.retCode})`,
      );
    }

    const timeNano =
      data.result?.timeNano;

    if (timeNano) {
      return Math.floor(
        Number(timeNano) / 1_000_000,
      );
    }

    const timeSecond =
      data.result?.timeSecond;

    if (!timeSecond) {
      throw new Error(
        "Bybit server time is missing.",
      );
    }

    return Number(timeSecond) * 1000;
  }

  async getSymbol(
    symbol: string,
  ): Promise<ExchangeSymbol> {
    const response = await this.request(
      `/v5/market/instruments-info?category=spot&symbol=${encodeURIComponent(
        symbol.toUpperCase(),
      )}`,
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    const data =
      await response.json() as BybitResponse<{
        category: string;
        list: BybitInstrument[];
      }>;

    if (data.retCode !== 0) {
      throw new Error(
        `Bybit API error: ${data.retMsg} (${data.retCode})`,
      );
    }

    const info = data.result?.list?.[0];

    if (!info) {
      throw new Error(
        `Bybit symbol not found: ${symbol}`,
      );
    }

    return {
      symbol: info.symbol,
      baseAsset: info.baseCoin,
      quoteAsset: info.quoteCoin,
      status: info.status,
      baseAssetPrecision:
        this.precisionFromStep(
          info.lotSizeFilter?.basePrecision,
        ),
      quoteAssetPrecision:
        this.precisionFromStep(
          info.lotSizeFilter?.quotePrecision,
        ),
      orderTypes: [
        "MARKET",
        "LIMIT",
      ],
      filters: this.parseFilters(info),
    };
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    const data =
      await this.signedJsonRequest<{
        accountType: "UNIFIED";
      }, {
        list?: BybitWalletAccount[];
      }>(
        "GET",
        "/v5/account/wallet-balance",
        {
          accountType: "UNIFIED",
        },
      );

    const account = data.result?.list?.[0];

    return (account?.coin ?? []).map(
      (coin) => ({
        asset: coin.coin,
        free: Number(
          coin.free ??
          coin.availableToWithdraw ??
          coin.walletBalance ??
          0,
        ),
        locked: Number(
          coin.locked ?? 0,
        ),
      }),
    );
  }

  async getBalance(
    asset: string,
  ): Promise<ExchangeBalance | undefined> {
    const data =
      await this.signedJsonRequest<{
        accountType: "UNIFIED";
        coin: string;
      }, {
        list?: BybitWalletAccount[];
      }>(
        "GET",
        "/v5/account/wallet-balance",
        {
          accountType: "UNIFIED",
          coin: asset.toUpperCase(),
        },
      );

    const coin =
      data.result?.list?.[0]?.coin?.[0];

    if (!coin) {
      return undefined;
    }

    return {
      asset: coin.coin,
      free: Number(
        coin.free ??
        coin.availableToWithdraw ??
        coin.walletBalance ??
        0,
      ),
      locked: Number(
        coin.locked ?? 0,
      ),
    };
  }

  async getPrice(
    symbol: string,
  ): Promise<number> {
    const response = await this.request(
      `/v5/market/tickers?category=spot&symbol=${encodeURIComponent(
        symbol.toUpperCase(),
      )}`,
    );

    if (!response.ok) {
      throw await this.error(response);
    }

    const data =
      await response.json() as BybitResponse<{
        category: string;
        list: BybitTicker[];
      }>;

    if (data.retCode !== 0) {
      throw new Error(
        `Bybit API error: ${data.retMsg} (${data.retCode})`,
      );
    }

    const ticker =
      data.result?.list?.[0];

    if (!ticker) {
      throw new Error(
        `Bybit ticker not found: ${symbol}`,
      );
    }

    return Number(ticker.lastPrice);
  }

  async createOrder(
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrder> {
    const body: Record<string, string | number> = {
      category: "spot",
      symbol: request.symbol.toUpperCase(),
      side:
        request.side === "BUY"
          ? "Buy"
          : "Sell",
      orderType:
        request.type === "MARKET"
          ? "Market"
          : "Limit",
      qty:
        request.quoteOrderQty !== undefined
          ? request.quoteOrderQty
          : request.quantity!,
    };

    if (
      request.type === "MARKET" &&
      request.quoteOrderQty !== undefined
    ) {
      body.marketUnit = "quoteCoin";
    }

    if (
      request.type === "LIMIT" ||
      request.type === "LIMIT_MAKER"
    ) {
      body.price = request.price!;

      body.timeInForce =
        request.type === "LIMIT_MAKER"
          ? "PostOnly"
          : "GTC";
    } else {
      body.timeInForce = "IOC";
    }

    if (request.clientOrderId) {
      body.orderLinkId =
        request.clientOrderId;
    }

    const data =
      await this.signedJsonRequest<
        Record<string, string | number>,
        {
          orderId: string;
          orderLinkId: string;
        }
      >(
        "POST",
        "/v5/order/create",
        body,
      );

    return {
      symbol:
        request.symbol.toUpperCase(),
      orderId:
        data.result!.orderId,
      clientOrderId:
        data.result!.orderLinkId ||
        request.clientOrderId,
      side:
        request.side,
      type:
        request.type,
      status:
        "NEW",
      price:
        Number(request.price ?? 0),
      originalQuantity:
        Number(
          request.quantity ??
          request.quoteOrderQty ??
          0,
        ),
      executedQuantity: 0,
    };
  }

  async getOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder> {
    const data =
      await this.signedJsonRequest<{
        category: "spot";
        symbol: string;
        orderId: string;
      }, {
        list?: BybitOrder[];
      }>(
        "GET",
        "/v5/order/realtime",
        {
          category: "spot",
          symbol:
            symbol.toUpperCase(),
          orderId,
        },
      );

    const order =
      data.result?.list?.[0];

    if (!order) {
      throw new Error(
        `Bybit order not found: ${orderId}`,
      );
    }

    return this.normalizeOrder(order);
  }

  async cancelOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder> {
    const data =
      await this.signedJsonRequest<{
        category: "spot";
        symbol: string;
        orderId: string;
      }, {
        orderId: string;
        orderLinkId: string;
      }>(
        "POST",
        "/v5/order/cancel",
        {
          category: "spot",
          symbol:
            symbol.toUpperCase(),
          orderId,
        },
      );

    const canceledOrderId =
      data.result?.orderId ?? orderId;

    try {
      return await this.getOrder(
        symbol,
        canceledOrderId,
      );
    } catch {
      return {
        symbol: symbol.toUpperCase(),
        orderId: canceledOrderId,
        side: "BUY",
        type: "MARKET",
        status: "CANCELED",
        price: 0,
        originalQuantity: 0,
        executedQuantity: 0,
      };
    }
  }

  close(): void {
    // REST API client has no persistent resources.
  }

  private parseFilters(
    info: BybitInstrument,
  ): SymbolFilter {
    return {
      minQty:
        this.numberOrUndefined(
          info.lotSizeFilter?.minOrderQty,
        ),

      maxQty:
        this.numberOrUndefined(
          info.lotSizeFilter?.maxOrderQty,
        ),

      minNotional:
        this.numberOrUndefined(
          info.lotSizeFilter?.minOrderAmt,
        ),

      tickSize:
        this.numberOrUndefined(
          info.priceFilter?.tickSize,
        ),

      minPrice:
        this.numberOrUndefined(
          info.priceFilter?.minPrice,
        ),

      maxPrice:
        this.numberOrUndefined(
          info.priceFilter?.maxPrice,
        ),

      stepSize:
        this.numberOrUndefined(
          info.lotSizeFilter?.qtyStep ??
          info.lotSizeFilter?.basePrecision,
        ),
    };
  }

  private normalizeOrder(
    order: BybitOrder,
  ): ExchangeOrder {
    return {
      symbol:
        order.symbol,

      orderId:
        order.orderId,

      clientOrderId:
        order.orderLinkId,

      side:
        order.side === "Buy"
          ? "BUY"
          : "SELL",

      type:
        order.orderType === "Market"
          ? "MARKET"
          : "LIMIT",

      status:
        normalizeOrderStatus(order.orderStatus),

      price:
        Number(order.price),

      originalQuantity:
        Number(order.qty),

      executedQuantity:
        Number(order.cumExecQty ?? 0),

      transactTime:
        order.updatedTime
          ? Number(order.updatedTime)
          : undefined,
    };
  }

  private precisionFromStep(
    value?: string,
  ): number | undefined {
    if (!value) {
      return undefined;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return undefined;
    }

    const text = value.replace(
      /0+$/,
      "",
    );

    const decimalIndex =
      text.indexOf(".");

    return decimalIndex === -1
      ? 0
      : text.length - decimalIndex - 1;
  }

  private numberOrUndefined(
    value?: string,
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : undefined;
  }

  private async signedJsonRequest<
    T extends Record<string, string | number>,
    R,
  >(
    method: "GET" | "POST",
    path: string,
    parameters: T,
  ): Promise<BybitResponse<R>> {
    if (!this.credentials) {
      throw new Error(
        "Bybit credentials are required for this operation.",
      );
    }

    const timestamp =
      String(Date.now());

    const recvWindow =
      RECV_WINDOW;

    const entries =
      Object.entries(parameters);

    const query =
      new URLSearchParams();

    for (const [key, value] of entries) {
      query.set(
        key,
        String(value),
      );
    }

    const payload =
      method === "GET"
        ? query.toString()
        : JSON.stringify(parameters);

    const signaturePayload =
      timestamp +
      this.credentials.apiKey +
      recvWindow +
      payload;

    const signature =
      crypto
        .createHmac(
          "sha256",
          this.credentials.apiSecret,
        )
        .update(signaturePayload)
        .digest("hex");

    const headers: Record<string, string> = {
      "X-BAPI-API-KEY":
        this.credentials.apiKey,
      "X-BAPI-SIGN":
        signature,
      "X-BAPI-SIGN-TYPE":
        "2",
      "X-BAPI-TIMESTAMP":
        timestamp,
      "X-BAPI-RECV-WINDOW":
        recvWindow,
      "Content-Type":
        "application/json",
    };

    const url =
      method === "GET"
        ? `${BASE_URL}${path}?${query.toString()}`
        : `${BASE_URL}${path}`;

    const response =
      await fetch(url, {
        method,
        headers,
        body:
          method === "POST"
            ? JSON.stringify(parameters)
            : undefined,
        cache: "no-store",
      });

    if (!response.ok) {
      throw await this.error(response);
    }

    const data =
      await response.json() as BybitResponse<R>;

    if (data.retCode !== 0) {
      throw new Error(
        `Bybit API error: ${data.retMsg} (${data.retCode})`,
      );
    }

    return data;
  }

  private async request(
    path: string,
  ): Promise<Response> {
    return fetch(
      `${BASE_URL}${path}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
  }

  private async error(
    response: Response,
  ): Promise<Error> {
    let message =
      `Bybit API error: HTTP ${response.status}`;

    try {
      const data =
        await response.json() as BybitResponse;

      if (data.retMsg) {
        message +=
          ` - ${data.retMsg}`;
      }

      message +=
        ` (${data.retCode})`;
    } catch {
      // Keep HTTP error.
    }

    return new Error(message);
  }
}
