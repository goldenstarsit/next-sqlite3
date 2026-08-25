export type StrategyStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export interface StrategyManifest {
  id: string;
  name: string;
  version: string;
  description: string;
}

export interface StrategyContext {
  now: Date;
}

export interface Strategy {
  readonly manifest: StrategyManifest;

  start(context: StrategyContext): Promise<void>;
  stop(): Promise<void>;
  getStatus(): StrategyStatus;
}
