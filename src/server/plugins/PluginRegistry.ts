import type { Plugin } from "./Plugin";

export class PluginRegistry {
  private readonly plugins = new Map<
    string,
    Plugin
  >();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(
        `Plugin already registered: ${plugin.name}`,
      );
    }

    this.plugins.set(
      plugin.name,
      plugin,
    );
  }

  get<T extends Plugin>(
    name: string,
  ): T {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(
        `Plugin not found: ${name}`,
      );
    }

    return plugin as T;
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  list(): string[] {
    return [...this.plugins.keys()];
  }
}
