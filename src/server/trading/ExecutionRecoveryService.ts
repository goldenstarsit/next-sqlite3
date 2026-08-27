import type {
  ExchangeOrder,
} from "../exchanges/core/types";

import {
  OrderPersistenceService,
} from "./services/OrderPersistenceService";

import {
  ExecutionAccountingService,
} from "./ExecutionAccountingService";

export interface RecoveryCandidate {
  id: number;
  exchange: string;
  symbol: string;
  order_id: string;
  status: string;
  executed_quantity: number;
}

export interface ExecutionRecoveryItem {
  orderId: string;
  symbol: string;
  order?: ExchangeOrder;
  accounting?: ReturnType<
    ExecutionAccountingService["process"]
  >;
  error?: string;
}

export interface ExecutionRecoveryResult {
  attempted: number;
  recovered: number;
  failed: number;
  results: ExecutionRecoveryItem[];
}

export class ExecutionRecoveryService {
  constructor(
    private readonly orderPersistence: OrderPersistenceService,
    private readonly accounting: ExecutionAccountingService,
  ) {}

  async recover(): Promise<ExecutionRecoveryResult> {
    const candidates =
      this.orderPersistence.findRecoveryCandidates();

    const results: ExecutionRecoveryItem[] = [];

    for (const candidate of candidates) {
      try {
        const order =
          await this.orderPersistence.getExchangeOrder(
            candidate.symbol,
            candidate.order_id,
          );

        this.orderPersistence.save(order);

        const accounting =
          this.accounting.process(order);

        results.push({
          orderId: candidate.order_id,
          symbol: candidate.symbol,
          order,
          accounting,
        });
      } catch (error) {
        results.push({
          orderId: candidate.order_id,
          symbol: candidate.symbol,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    return {
      attempted: candidates.length,
      recovered: results.filter(
        (result) =>
          result.order !== undefined &&
          result.accounting !== undefined &&
          result.error === undefined,
      ).length,
      failed: results.filter(
        (result) =>
          result.error !== undefined,
      ).length,
      results,
    };
  }
}
