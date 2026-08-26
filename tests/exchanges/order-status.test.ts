import { describe, expect, it } from "vitest";
import {
  normalizeOrderStatus,
} from "../../src/server/exchanges/core/types";

describe("Exchange order status normalization", () => {
  it.each([
    ["NEW", "NEW"],
    ["OPEN", "NEW"],
    ["PARTIALLY_FILLED", "PARTIALLY_FILLED"],
    ["Filled", "FILLED"],
    ["CANCELED", "CANCELED"],
    ["CANCELLED", "CANCELED"],
    ["REJECTED", "REJECTED"],
    ["EXPIRED", "EXPIRED"],
    ["something_unknown", "UNKNOWN"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeOrderStatus(input)).toBe(expected);
  });
});
