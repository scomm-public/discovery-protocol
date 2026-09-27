/**
 * Reference parser and verifier for Scomm/grant/v1 (spec/otp-grants.md).
 */

import { createPublicKey, verify } from "node:crypto";

export const GRANT_HEADER = "Scomm/grant/v1";

export const GRANT_FIELDS = [
  "iss",
  "aud",
  "kid",
  "purpose",
  "identity_id",
  "msk_fingerprint",
  "amr",
  "idp",
  "exp",
  "jti",
];

function ed25519Key(rawB64url) {
  return createPublicKey({
    key: Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(rawB64url, "base64url"),
    ]),
    format: "der",
    type: "spki",
  });
}

/** Parse the signed text. Returns claims or throws with a reason. */
export function parseGrantText(text) {
  if (!text.endsWith("\n")) throw new Error("format");
  const lines = text.slice(0, -1).split("\n");
  if (lines[0] !== GRANT_HEADER || lines.length !== GRANT_FIELDS.length + 1) {
    throw new Error("format");
  }
  const claims = {};
  GRANT_FIELDS.forEach((field, i) => {
    const line = lines[i + 1];
    const prefix = `${field}=`;
    if (!line.startsWith(prefix)) throw new Error("format");
    claims[field] = line.slice(prefix.length);
  });
  return claims;
}

/**
 * @param {string} token
 * @param {{ keySet: Record<string, { public_key: string }>, audience: string, issuer: string, nowMs: number }} opts
 */
export function verifyGrant(token, { keySet, audience, issuer, nowMs }) {
  const parts = String(token).split(".");
  if (parts.length !== 2) throw new Error("format");
  const textBytes = Buffer.from(parts[0], "base64url");
  const text = textBytes.toString("utf8");
  const claims = parseGrantText(text);
  const entry = keySet[claims.kid];
  if (!entry) throw new Error("kid");
  const ok = verify(
    null,
    textBytes,
    ed25519Key(entry.public_key),
    Buffer.from(parts[1], "base64url"),
  );
  if (!ok) throw new Error("signature");
  if (claims.iss !== issuer) throw new Error("issuer");
  if (!claims.aud.split(" ").includes(audience)) throw new Error("audience");
  const exp = Number(claims.exp);
  if (!Number.isSafeInteger(exp) || exp <= nowMs) throw new Error("expired");
  if (!/^[0-9a-f]{64}$/.test(claims.identity_id)) throw new Error("format");
  if (claims.msk_fingerprint && !/^[0-9a-f]{64}$/.test(claims.msk_fingerprint)) {
    throw new Error("format");
  }
  if (!["otp", "id_token"].includes(claims.amr)) throw new Error("format");
  if (Buffer.from(claims.jti, "base64url").length !== 16) throw new Error("format");
  return claims;
}
