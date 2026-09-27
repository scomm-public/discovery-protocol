#!/usr/bin/env node
/**
 * Regenerate examples/v1/api/grant-vectors.json from a fixed test seed.
 * The seed is public test material. Never use it outside tests.
 */

import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_HEX = "42".repeat(32);
const KID = "test-2026-09";
const NOW_MS = 1790000000000;

const privateKey = createPrivateKey({
  key: Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    Buffer.from(SEED_HEX, "hex"),
  ]),
  format: "der",
  type: "pkcs8",
});
const publicKeyRaw = createPublicKey(privateKey)
  .export({ format: "der", type: "spki" })
  .subarray(-32);

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

export function grantText(claims) {
  const lines = ["Scomm/grant/v1"];
  for (const field of GRANT_FIELDS) {
    lines.push(`${field}=${claims[field] ?? ""}`);
  }
  return `${lines.join("\n")}\n`;
}

function token(text, key = privateKey) {
  const sig = sign(null, Buffer.from(text, "utf8"), key);
  return `${Buffer.from(text, "utf8").toString("base64url")}.${sig.toString("base64url")}`;
}

const base = {
  iss: "https://discovery.scomm.ai",
  kid: KID,
  identity_id: "cd".repeat(32),
  exp: String(NOW_MS + 5 * 60 * 1000),
};

const valid = [
  {
    name: "vault_open via email OTP",
    claims: {
      ...base,
      aud: "https://vault.scomm.ai",
      purpose: "vault_open",
      msk_fingerprint: "11".repeat(32),
      amr: "otp",
      idp: "",
      jti: "AAECAwQFBgcICQoLDA0ODw",
    },
  },
  {
    name: "recovery_generation via Google ID token",
    claims: {
      ...base,
      aud: "https://vault.scomm.ai",
      purpose: "recovery_generation",
      msk_fingerprint: "11".repeat(32),
      amr: "id_token",
      idp: "google",
      jti: "EBESExQVFhcYGRobHB0eHw",
    },
  },
  {
    name: "replace_msk vault grant listing two audiences",
    claims: {
      ...base,
      aud: "https://vault.scomm.ai https://vault-eu.scomm.ai",
      purpose: "replace_msk",
      identity_id: "ab".repeat(32),
      msk_fingerprint: "22".repeat(32),
      amr: "otp",
      idp: "",
      jti: "ICEiIyQlJicoKSorLC0uLw",
    },
  },
].map(({ name, claims }) => {
  const text = grantText(claims);
  return { name, claims, text, token: token(text) };
});

const good = valid[0];
const [goodBody, goodSig] = good.token.split(".");
const tamperedText = good.text.replace("purpose=vault_open", "purpose=vault_backup");
const expiredText = grantText({ ...good.claims, exp: String(NOW_MS - 1) });

const invalid = [
  {
    name: "text changed after signing",
    token: `${Buffer.from(tamperedText, "utf8").toString("base64url")}.${goodSig}`,
    reason: "signature",
  },
  {
    name: "expired",
    token: token(expiredText),
    reason: "expired",
  },
  {
    name: "audience is discovery only",
    token: token(grantText({ ...good.claims, aud: "https://discovery.scomm.ai" })),
    reason: "audience",
  },
  {
    name: "unknown kid",
    token: token(grantText({ ...good.claims, kid: "not-published" })),
    reason: "kid",
  },
  {
    name: "field order changed",
    token: token(good.text.replace(/^(iss=.*)\n(aud=.*)\n/m, "$2\n$1\n")),
    reason: "format",
  },
  {
    name: "signature truncated",
    token: `${goodBody}.${goodSig.slice(0, 40)}`,
    reason: "signature",
  },
];

const document = {
  description:
    "Scomm/grant/v1 vectors. Verify each valid token with the key set at now_ms and audience https://vault.scomm.ai. Each invalid token must be rejected for the stated reason.",
  insecure_test_material: true,
  seed_hex: SEED_HEX,
  now_ms: NOW_MS,
  key_set: {
    [KID]: {
      alg: "Ed25519",
      public_key: Buffer.from(publicKeyRaw).toString("base64url"),
    },
  },
  fields: GRANT_FIELDS,
  valid,
  invalid,
};

writeFileSync(
  join(root, "examples", "v1", "api", "grant-vectors.json"),
  `${JSON.stringify(document, null, 2)}\n`,
);
console.log("wrote examples/v1/api/grant-vectors.json");
