import type {
  Exchange,
  ExchangeOrder,
  ExchangeOrderRequest,
  ExchangeSymbol,
} from "./types/Exchange";

export class BinanceClient implements Exchange {
  readonly name = "binance";

  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    testnet = false,
  ) {
    this.baseUrl = testnet
      ? "https://testnet.binance.vision"
      : "https://api.binance.com";
  }

  async getSymbol(
    symbol: string,
  ): Promise<ExchangeSymbol> {
    const response = await fetch(
      `${this.baseUrl}/api/v3/exchangeInfo?symbol=${encodeURIComponent(symbol)}`,
    );

    if (!response.ok) {
      throw new Error(
        `Binance exchangeInfo failed: ${response.status}`,
      );
    }

    const data = await response.json();

    const result = data.symbols?.[0];

    if (!result) {
      throw new Error(
        `Binance symbol not found: ${symbol}`,
      );
    }

    return {
      symbol: result.symbol,
      baseAsset: result.baseAsset,
      quoteAsset: result.quoteAsset,
      status: result.status,
    };
  }

  async getPrice(
    symbol: string,
  ): Promise<number> {
    const response = await fetch(
      `${this.baseUrl}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
    );

    if (!response.ok) {
      throw new Error(
        `Binance ticker failed: ${response.status}`,
      );
    }

    const data = await response.json();

    return Number(data.price);
  }

  async getMinimumOrderAmount(
    _symbol: string,
  ): Promise<number> {
    /*
     * Actual calculation will be performed by the
     * Binance filter service using exchangeInfo.
     */
    throw new Error(
      "Binance minimum order calculation is not implemented yet.",
    );
  }

  async placeOrder(
    _request: ExchangeOrderRequest,
  ): Promise<ExchangeOrder> {
    /*
     * Signed trading API will be implemented separately.
     *
     * Never send API credentials to the frontend.
     */
    throw new Error(
      "Binance order execution is not implemented yet.",
    );
  }
}
