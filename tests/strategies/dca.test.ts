import { describe, expect, it } from "vitest";
import { calculateDCAPrice } from "../../src/server/strategies/dca/priceCalculator";
import { validateDCAConfig } from "../../src/server/strategies/dca/validator";
import { defaultDCAConfig } from "../../src/server/strategies/dca/config";

describe("DCA strategy", () => {
  it("calculates DCA prices from initial entry price", () => {
    expect(
      calculateDCAPrice(100, 2),
    ).toBe(98);

    expect(
      calculateDCAPrice(100, 4),
    ).toBe(96);

    expect(
      calculateDCAPrice(100, 10),
    ).toBe(90);
  });

  it("validates default configuration", () => {
    expect(() =>
      validateDCAConfig(defaultDCAConfig),
    ).not.toThrow();
  });

  it("rejects invalid percentage", () => {
    expect(() =>
      calculateDCAPrice(100, 100),
    ).toThrow();
  });
});
