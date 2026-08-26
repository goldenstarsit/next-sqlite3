import type {
  Exchange,
  ExchangeBalance,
} from "../../exchanges/core/types";

export class BalanceService {
  constructor(
    private readonly exchange: Exchange,
  ) {}

  async getBalance(
    asset: string,
  ): Promise<ExchangeBalance | undefined> {
    return this.exchange.getBalance(asset);
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    return this.exchange.getBalances();
  }
}
