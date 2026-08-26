import type {
  RotationPriceAverages,
} from "./RotationPriceStore";

export interface ExpectedPriceResult {
  expectedPrice: number;
  realPrice: number;
  variationPercent: number;
}

export class RotationIndicators {
  calculate(
    averages: RotationPriceAverages,
  ): ExpectedPriceResult {
    /*
     * The 1-second average represents the
     * real/current market price.
     */
    const realPrice =
      averages.secondAverage;

    /*
     * Expected price is derived from the
     * longer market horizons.
     *
     * Current price is deliberately excluded.
     */
    const expectedPrice =
      (
        averages.minuteAverage +
        averages.hourAverage +
        averages.dayAverage
      ) / 3;

    if (
      !Number.isFinite(expectedPrice) ||
      expectedPrice <= 0 ||
      !Number.isFinite(realPrice) ||
      realPrice <= 0
    ) {
      return {
        expectedPrice: 0,
        realPrice,
        variationPercent: 0,
      };
    }

    /*
     * Required convention:
     *
     * real < expected => positive
     * real > expected => negative
     */
    const variationPercent =
      (
        (expectedPrice - realPrice) /
        expectedPrice
      ) * 100;

    return {
      expectedPrice,
      realPrice,
      variationPercent,
    };
  }
}
