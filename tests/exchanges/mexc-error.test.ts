import { describe, expect, it } from "vitest";
import { createMexcError } from "../../src/server/exchanges/mexc/MexcError";

describe("MexcError", () => {
  it("maps credentials", () => {
    expect(createMexcError("Invalid credentials", 700002).code)
      .toBe("INVALID_CREDENTIALS");
  });

  it("maps balance", () => {
    expect(createMexcError("Insufficient balance", 30004).code)
      .toBe("INSUFFICIENT_BALANCE");
  });

  it("maps rate limit", () => {
    expect(createMexcError("Too many requests", 429).code)
      .toBe("RATE_LIMIT");
  });

  it("preserves identity", () => {
    const error = createMexcError("test", 700002, 401);
    expect(error.exchange).toBe("mexc");
    expect(error.exchangeCode).toBe(700002);
    expect(error.status).toBe(401);
  });
});
