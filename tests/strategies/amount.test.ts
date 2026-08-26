import {
  describe,
  expect,
  it,
} from "vitest";

import {
  absoluteAmount,
  percentageAmount,
} from "../../src/server/strategies/core";

describe("Strategy Amount", () => {
  it("creates an absolute amount", () => {
    expect(
      absoluteAmount(10),
    ).toEqual({
      value: 10,
      mode: "ABSOLUTE",
    });
  });

  it("creates a percentage amount", () => {
    expect(
      percentageAmount(25),
    ).toEqual({
      value: 25,
      mode: "PERCENTAGE",
    });
  });
});
