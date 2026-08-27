import { describe, expect, it } from "vitest";
import { createBybitError } from "../../src/server/exchanges/bybit/BybitError";

describe("BybitError", () => {
  it("maps credentials", () => {
    expect(createBybitError("Invalid API key", 10003).code)
      .toBe("INVALID_CREDENTIALS");
  });

  it("maps rate limit", () => {
    expect(createBybitError("Too many requests", 10006).code)
      .toBe("RATE_LIMIT");
  });

  it("maps balance", () => {
    expect(createBybitError("Insufficient balance", 110004).code)
      .toBe("INSUFFICIENT_BALANCE");
  });

  it("preserves identity", () => {
    const error = createBybitError("test", 10003, 401);
    expect(error.exchange).toBe("bybit");
    expect(error.exchangeCode).toBe(10003);
    expect(error.status).toBe(401);
  });
});
