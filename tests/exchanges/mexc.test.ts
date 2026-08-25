import { describe, expect, it } from "vitest";
import { MexcExchange } from "../../src/server/exchanges/mexc/MexcExchange";

describe("MEXC Exchange Plugin", () => {
  it("has the correct exchange identity", () => {
    const exchange = new MexcExchange();

    expect(exchange.id).toBe("mexc");
    expect(exchange.name).toBe("MEXC");
  });

  it("requires credentials for private operations", async () => {
    const exchange = new MexcExchange();

    await expect(
      exchange.getBalances(),
    ).rejects.toThrow(
      "MEXC credentials are required",
    );
  });

  it("requires credentials for order creation", async () => {
    const exchange = new MexcExchange();

    await expect(
      exchange.createOrder({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quoteOrderQty: 10,
      }),
    ).rejects.toThrow(
      "MEXC credentials are required",
    );
  });
});
