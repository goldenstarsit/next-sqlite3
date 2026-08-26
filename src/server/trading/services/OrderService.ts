import type {
  Exchange,
  ExchangeOrder,
  ExchangeOrderRequest,
} from "../../exchanges/core/types";

export class OrderService {
  constructor(
    private readonly exchange: Exchange,
  ) {}

  /**
   * Exposes the shared exchange to higher-level
   * trading services such as StrategyOrderResolver.
   */
  getExchange(): Exchange {
    return this.exchange;
  }

  async createOrder(
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrder> {
    return this.exchange.createOrder(request);
  }

  async getOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder> {
    return this.exchange.getOrder(
      symbol,
      orderId,
    );
  }

  async cancelOrder(
    symbol: string,
    orderId: string,
  ): Promise<ExchangeOrder> {
    return this.exchange.cancelOrder(
      symbol,
      orderId,
    );
  }
}
