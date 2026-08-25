import {
  describe,
  expect,
  it,
} from "vitest";

import {
  BinancePlugin,
} from "../../src/server/exchanges/binance";

describe("Binance plugin", () => {
  it("has the correct plugin name", () => {
    const plugin = new BinancePlugin({
      enabled: true,
      apiKey: "test-key",
      apiSecret: "test-secret",
      testnet: true,
    });

    expect(plugin.name).toBe("binance");
  });

  it("does not expose API credentials", () => {
    const plugin = new BinancePlugin({
      enabled: true,
      apiKey: "secret-key",
      apiSecret: "secret-value",
      testnet: true,
    });

    const config = plugin.getConfig();

    expect(config.apiKey).toBe("");
    expect(config.apiSecret).toBe("");
  });

  it("creates an exchange client", () => {
    const plugin = new BinancePlugin({
      enabled: true,
      apiKey: "test-key",
      apiSecret: "test-secret",
      testnet: true,
    });

    expect(
      plugin.getExchange().name,
    ).toBe("binance");
  });
});
