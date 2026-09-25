# Signing keys and verification-key lookup

**Protocol version:** `0.2-draft`

A **signing key** is the private key that produces a signature. It stays on
the device. The only copy off the device is inside the encrypted CKVF vault.
Discovery does not store it, list it, or return it.

A **verification key** is the public half other clients use to check one
signature. The directory may store that public material. It serves it only
for a specific signature.

## 1. Signing keys are not a discovery resource

`GET /v1/mailboxes/{mailboxSha256}` MUST NOT project signing keys under
`capabilities.crypto.signing` or any other capability.

`GET /v1/keys` with `purpose=signing` MUST fail. A signing key is not
selected by capability negotiation and is not fetched with `key_id`.
The discovery purpose is `verify`.

Clients MUST NOT upload a signing private key to the directory. Vault
upload carries the encrypted container only.

## 2. Verify keys (gated)

`GET /v1/keys` with `purpose=verify` MUST require both:

1. **mailboxSha256** — unsalted SHA-256 of the canonical mailbox, 64 hex.
   This is not the vault OPRF identity. Salted identity is a vault
   locator only.
2. a **valid key-id** for the published verify material of the key
   that signed the message.

Otherwise the service MUST respond as if no key exists (HTTP `400` when
`key_id` is missing, HTTP `404` with `capability_mismatch` or `not_found`
when the id does not match). It MUST NOT return another key for that
mailbox.

The public Discovery Document MUST NOT project verification material into
`capabilities.crypto.verification`. Encryption keys MAY still appear for
send-side discovery.

## 3. Key-id formats

### 3.1 SComm content-addressable key-id

SComm-generated verification ids are **content-addressable**:

- Take the **published** verification `public_material` bytes (decoded from
  the wire base64url form used at upload).
- Compute `SHA-256(public_material)`.
- Take the **first 32 bits** (4 octets) of that digest.
- Encode as **8 hex digits**, grouped `xxxx-xxxx` (case-insensitive on
  input; servers SHOULD normalize to uppercase for storage/comparison).

Example: `A1B2-C3D4`

Clients MUST embed this key-id on outbound SComm-signed mail (header
`X-Scomm-Signing-Key-Id`) so recipients can fetch the verification key
without listing keys.

### 3.2 Other publishers

Other OpenPGP / S/MIME senders MAY register any opaque key-id string they
choose (for example a traditional OpenPGP 64-bit Key ID or fingerprint
fragment), subject to server length limits. Matching is by exact normalized
equality against the id stored with the artifact.

## 4. HTTP

| Query | `purpose=signing` | `purpose=verify` |
| --- | --- | --- |
| `sha256` | Request MUST fail | Required — unsalted mailbox hash |
| `key_id` | Not used | Required — SComm `xxxx-xxxx` or publisher-chosen id |
| `capabilities` | Not used | Ignored when `key_id` binds the artifact |

## 5. Client verify path

1. Detect `multipart/signed`.
2. Read `X-Scomm-Signing-Key-Id`, or a publisher-specific issuer id from the
   signature when that id was registered on the service.
3. `GET /v1/keys?sha256=…&key_id=…&purpose=verify`, where `sha256` is the
   unsalted mailbox hash.
4. Verify locally against the returned public material only.

Do not call `purpose=signing`. Do not use the vault OPRF identity as
`sha256`. Do not fall back to an unbound key list when the header is missing.
