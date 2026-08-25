import type {
  Strategy,
  StrategyContext,
  StrategyStatus,
} from "../core/types";
import { dcaManifest } from "./manifest";

export class DCAStrategy implements Strategy {
  readonly manifest = dcaManifest;

  private status: StrategyStatus = "stopped";

  async start(_context: StrategyContext): Promise<void> {
    if (this.status === "running") {
      return;
    }

    this.status = "starting";

    // Trading engine will be connected in the next step.

    this.status = "running";
  }

  async stop(): Promise<void> {
    if (this.status === "stopped") {
      return;
    }

    this.status = "stopping";

    // Trading engine shutdown will be connected here.

    this.status = "stopped";
  }

  getStatus(): StrategyStatus {
    return this.status;
  }
}
