import {
  RotationStrategy,
} from "./RotationStrategy";

export class RotationPlugin
  extends RotationStrategy {
  readonly pluginId = "rotation";

  getEngine() {
    return this.engine;
  }
}

export function createRotationPlugin(
  config?: Record<string, unknown>,
): RotationPlugin {
  return new RotationPlugin(
    config as never,
  );
}
