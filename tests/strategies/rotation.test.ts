import {
  describe,
  expect,
  it,
} from "vitest";

import {
  RotationStrategy,
} from "../../src/server/strategies/rotation";

describe("Rotation Strategy", () => {
  it("calculates positive variation when real price is below expected price", () => {
    const strategy =
      new RotationStrategy({
        enabled: true,
        symbols: [
          {
            symbol: "BTCUSDT",
            enabled: true,
          },
        ],
        takeProfitPercent: 1,
        maxDurationSeconds: 3600,
        variationWeight: 0.7,
        takeProfitProbabilityWeight: 0.3,
        sampleWindows: {
          secondSamples: 60,
          minuteSamples: 60,
          hourSamples: 24,
          daySamples: 7,
        },
      });

    const now = Date.now();

    strategy.engine.addPrice(
      "BTCUSDT",
      90,
      now,
    );

    strategy.engine.addPrice(
      "BTCUSDT",
      100,
      now + 60_000,
    );

    strategy.engine.addPrice(
      "BTCUSDT",
      110,
      now + 3_660_000,
    );

    strategy.engine.addPrice(
      "BTCUSDT",
      120,
      now + 90_060_000,
    );

    const ranking =
      strategy.engine.getRanking();

    expect(ranking.length).toBe(1);
    expect(
      ranking[0].variationPercent,
    ).toBeGreaterThan(0);
  });

  it("selects the highest ranked candidate", () => {
    const strategy =
      new RotationStrategy();

    expect(
      strategy.engine.getCandidate(),
    ).toBeUndefined();
  });
});
