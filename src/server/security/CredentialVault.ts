import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const encoded = process.env.TRADINGBOT_CREDENTIAL_KEY;

  if (!encoded) {
    throw new Error(
      "TRADINGBOT_CREDENTIAL_KEY is required",
    );
  }

  const key = Buffer.from(encoded, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "TRADINGBOT_CREDENTIAL_KEY must decode to 32 bytes",
    );
  }

  return key;
}

export function generateCredentialKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}

export function encryptCredential(
  value: string,
): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(
    ALGORITHM,
    key,
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptCredential(
  value: string,
): string {
  const key = getEncryptionKey();

  const parts = value.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted credential format",
    );
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = Buffer.from(parts[2], "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error(
      "Invalid encrypted credential IV",
    );
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      "Invalid encrypted credential auth tag",
    );
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    iv,
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
