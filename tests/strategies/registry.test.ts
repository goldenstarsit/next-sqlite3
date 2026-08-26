import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createStrategy,
  getAvailableStrategies,
} from "../../src/server/strategies/core/registry";

describe("Strategy Registry Factory", () => {
  it("lists all supported strategies", () => {
    expect(
      getAvailableStrategies(),
    ).toEqual([
      "dca",
      "grid",
      "rotation",
    ]);
  });

  it("creates DCA strategy", () => {
    const strategy =
      createStrategy("dca");

    expect(strategy.id).toBe("dca");
    expect(strategy.name).toBe("DCA");
  });

  it("creates Grid strategy", () => {
    const strategy =
      createStrategy("grid", {
        enabled: true,
        lowerPrice: 90,
        upperPrice: 110,
        gridCount: 5,
        orderAmountPercentage: 100,
        minimumOrderMode:
          "exchange-minimum",
      });

    expect(strategy.id).toBe("grid");
    expect(strategy.name).toBe("Grid");
  });

  it("creates Rotation strategy", () => {
    const strategy =
      createStrategy("rotation");

    expect(strategy.id).toBe("rotation");
    expect(strategy.name).toBe("Rotation");
  });

  it("rejects unsupported strategy", () => {
    expect(() =>
      createStrategy(
        "unsupported" as never,
      ),
    ).toThrow(
      "Unsupported strategy: unsupported",
    );
  });
});
