import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  decryptCredential,
  encryptCredential,
  generateCredentialKey,
} from "../../src/server/security/CredentialVault";

describe("CredentialVault", () => {
  beforeEach(() => {
    process.env.TRADINGBOT_CREDENTIAL_KEY =
      generateCredentialKey();
  });

  it("generates a valid 32-byte base64 key", () => {
    const key = generateCredentialKey();

    expect(
      Buffer.from(key, "base64").length,
    ).toBe(32);
  });

  it("encrypts and decrypts credentials", () => {
    const encrypted = encryptCredential(
      "super-secret-api-key",
    );

    expect(encrypted).not.toContain(
      "super-secret-api-key",
    );

    expect(
      decryptCredential(encrypted),
    ).toBe("super-secret-api-key");
  });

  it("produces different ciphertext for the same value", () => {
    const first = encryptCredential("secret");
    const second = encryptCredential("secret");

    expect(first).not.toBe(second);

    expect(decryptCredential(first)).toBe("secret");
    expect(decryptCredential(second)).toBe("secret");
  });

  it("rejects an invalid encryption key", () => {
    process.env.TRADINGBOT_CREDENTIAL_KEY =
      Buffer.alloc(16).toString("base64");

    expect(() =>
      encryptCredential("secret"),
    ).toThrow(
      "TRADINGBOT_CREDENTIAL_KEY must decode to 32 bytes",
    );
  });

  it("rejects malformed ciphertext", () => {
    expect(() =>
      decryptCredential("invalid"),
    ).toThrow(
      "Invalid encrypted credential format",
    );
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptCredential("secret");

    const parts = encrypted.split(".");
    parts[2] =
      Buffer.from("tampered").toString("base64");

    expect(() =>
      decryptCredential(parts.join(".")),
    ).toThrow();
  });

  it("requires an encryption key", () => {
    delete process.env.TRADINGBOT_CREDENTIAL_KEY;

    expect(() =>
      encryptCredential("secret"),
    ).toThrow(
      "TRADINGBOT_CREDENTIAL_KEY is required",
    );
  });
});
