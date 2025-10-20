import crypto from "crypto";

/**
 * Compute a SHA-256 hex digest of the provided buffer.
 * If a `salt` is provided, compute an HMAC using the salt as key
 * so the resulting hash is namespaced (e.g. per-user).
 *
 * @param {Buffer} buffer
 * @param {string} [salt] optional salt or key (e.g. userId)
 * @returns {string|null}
 */
export function computeFileHash(buffer, salt) {
  if (!buffer) return null;
  if (salt) {
    // Use HMAC-SHA256 with the salt as key to produce a salted hash.
    return crypto.createHmac("sha256", String(salt)).update(buffer).digest("hex");
  }
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function computeTitleHmac(title) {
  const key = process.env.HMAC_SECRET || process.env.ENCRYPTION_HMAC_KEY || process.env.JWT_SECRET || "dev-fallback-hmac-key";
  return crypto.createHmac("sha256", key).update(String(title || "")).digest("hex");
}
