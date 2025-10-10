import crypto from "crypto";

export function computeFileHash(buffer) {
  if (!buffer) return null;
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function computeTitleHmac(title) {
  const key = process.env.HMAC_SECRET || process.env.ENCRYPTION_HMAC_KEY || process.env.JWT_SECRET || "dev-fallback-hmac-key";
  return crypto.createHmac("sha256", key).update(String(title || "")).digest("hex");
}
