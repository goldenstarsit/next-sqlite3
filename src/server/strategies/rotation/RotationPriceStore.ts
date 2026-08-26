interface PriceSample {
  timestamp: number;
  price: number;
}

export interface RotationPriceAverages {
  secondAverage: number;
  minuteAverage: number;
  hourAverage: number;
  dayAverage: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export class RotationPriceStore {
  private readonly samples = new Map<
    string,
    PriceSample[]
  >();

  addPrice(
    symbol: string,
    price: number,
    timestamp = Date.now(),
  ): void {
    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new Error(
        "Price must be greater than zero.",
      );
    }

    const key = symbol.toUpperCase();

    const history =
      this.samples.get(key) ?? [];

    history.push({
      timestamp,
      price,
    });

    const cutoff =
      timestamp - WEEK;

    const filtered = history.filter(
      (sample) =>
        sample.timestamp >= cutoff,
    );

    this.samples.set(key, filtered);
  }

  getAverages(
    symbol: string,
  ): RotationPriceAverages | undefined {
    const history =
      this.samples.get(
        symbol.toUpperCase(),
      );

    if (!history?.length) {
      return undefined;
    }

    const now =
      history[history.length - 1].timestamp;

    /*
     * Current price:
     *
     * Average of the most recent 60
     * one-second samples.
     */
    const secondSamples =
      this.lastSamples(
        history,
        60,
      );

    /*
     * 1-minute average:
     *
     * Average of samples covering
     * the most recent minute.
     */
    const minuteSamples =
      this.samplesInWindow(
        history,
        now,
        MINUTE,
      );

    /*
     * 1-hour average.
     */
    const hourSamples =
      this.samplesInWindow(
        history,
        now,
        HOUR,
      );

    /*
     * 1-day average.
     */
    const daySamples =
      this.samplesInWindow(
        history,
        now,
        DAY,
      );

    /*
     * We need enough data for all
     * requested horizons.
     */
    if (
      secondSamples.length === 0 ||
      minuteSamples.length === 0 ||
      hourSamples.length === 0 ||
      daySamples.length === 0
    ) {
      return undefined;
    }

    const secondAverage =
      this.average(secondSamples);

    const minuteAverage =
      this.average(minuteSamples);

    const hourAverage =
      this.average(hourSamples);

    const dayAverage =
      this.average(daySamples);

    if (
      secondAverage === undefined ||
      minuteAverage === undefined ||
      hourAverage === undefined ||
      dayAverage === undefined
    ) {
      return undefined;
    }

    return {
      secondAverage,
      minuteAverage,
      hourAverage,
      dayAverage,
    };
  }

  clear(symbol?: string): void {
    if (symbol) {
      this.samples.delete(
        symbol.toUpperCase(),
      );
      return;
    }

    this.samples.clear();
  }

  private samplesInWindow(
    samples: PriceSample[],
    now: number,
    window: number,
  ): PriceSample[] {
    return samples.filter(
      (sample) =>
        now - sample.timestamp < window,
    );
  }

  private lastSamples(
    samples: PriceSample[],
    count: number,
  ): PriceSample[] {
    return samples.slice(
      Math.max(0, samples.length - count),
    );
  }

  private average(
    samples: PriceSample[],
  ): number | undefined {
    if (!samples.length) {
      return undefined;
    }

    return (
      samples.reduce(
        (sum, sample) =>
          sum + sample.price,
        0,
      ) / samples.length
    );
  }
}
