export interface BinanceConfig {
  enabled: boolean;

  apiKey: string;
  apiSecret: string;

  testnet: boolean;

  baseUrl?: string;
}
