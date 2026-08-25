import type { BinanceConfig } from "./BinanceConfig";
import { BinanceClient } from "./BinanceClient";

export class BinancePlugin {
  readonly name = "binance";

  private client: BinanceClient;

  constructor(
    private config: BinanceConfig,
  ) {
    this.client = this.createClient(config);
  }

  private createClient(
    config: BinanceConfig,
  ): BinanceClient {
    return new BinanceClient(
      config.apiKey,
      config.apiSecret,
      config.testnet,
    );
  }

  getConfig(): BinanceConfig {
    return {
      ...this.config,

      /*
       * Never expose credentials through returned
       * configuration objects.
       */
      apiKey: "",
      apiSecret: "",
    };
  }

  updateConfig(
    config: BinanceConfig,
  ): void {
    this.validateConfig(config);

    this.config = config;
    this.client = this.createClient(config);
  }

  getExchange(): BinanceClient {
    return this.client;
  }

  private validateConfig(
    config: BinanceConfig,
  ): void {
    if (!config.apiKey) {
      throw new Error(
        "Binance API key is required.",
      );
    }

    if (!config.apiSecret) {
      throw new Error(
        "Binance API secret is required.",
      );
    }
  }
}
