# Signing key discovery and verification-key lookup

**Protocol version:** `0.2-draft`

Signing publication and verification fetch are different operations.

## 1. Signing keys (ungated)

A **signing key** is the public key a mailbox publishes so others can see who
signs for that address. It is the same class of discovery as an encryption key.

A Discovery service MUST allow callers who know only `mailboxSha256` to:

1. Read published signing keys from
   `GET /v1/mailboxes/{mailboxSha256}` under
   `capabilities.crypto.signing`.
2. Select one signing key with
   `GET /v1/keys?sha256={hex}&purpose=signing` using capability negotiation.
   `key_id` is optional. When it is present, the service returns that artifact
   if it is an active signing key for the mailbox. When it is absent, the
   service selects the best mutually supported signing key, the same way it
   selects an encryption key.

The service MUST NOT require `key_id` for `purpose=signing`.

Clients MAY use this path to display or publish “who signs for this mailbox”.
Clients MUST NOT use an unbound list of signing keys to verify a message by
trying keys until one succeeds.

## 2. Verification keys (gated)

A **verification key** is the public key that checks one signature. Serving it
without the key-id of the key that signed the message lets a verifier try an
unbound set of keys. That breaks signature–issuer binding.

`GET /v1/keys` with `purpose=verification` MUST require both:

1. **mailboxSha256** (SHA-256 of the canonical mailbox, 64 hex), and
2. a **valid key-id** for a published signing artifact.

Otherwise the service MUST respond as if no key exists (HTTP `400` when
`key_id` is missing, HTTP `404` with `capability_mismatch` or `not_found` when
the id does not match). It MUST NOT return another signing key for that
mailbox.

`purpose=verification` is not a synonym of `purpose=signing`.

The public Discovery Document MUST NOT project verification material into
`capabilities.crypto.verification`. Encryption keys and signing keys MAY still
appear for discovery.

## 3. Key-id formats

### 3.1 SComm content-addressable key-id

SComm-generated signing keys use a **content-addressable** key-id:

- Take the **published** `public_material` bytes (decoded from the wire
  base64url form used at upload).
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

| Query | `purpose=signing` | `purpose=verification` |
| --- | --- | --- |
| `sha256` | Required | Required |
| `key_id` | Optional | Required — SComm `xxxx-xxxx` or publisher-chosen id |
| `capabilities` | Used when `key_id` is omitted | Ignored when `key_id` binds the artifact |

## 5. Client verify path

1. Detect `multipart/signed`.
2. Read `X-Scomm-Signing-Key-Id`, or a publisher-specific issuer id from the
   signature when that id was registered on the service.
3. `GET /v1/keys?sha256=…&key_id=…&purpose=verification`.
4. Verify locally against the returned material only.

Address-book import of third-party keys (when the sender does not publish on
the service) is a client feature and is out of scope for this lookup rule.
The default path remains gated verification fetch. Do not fall back to
`purpose=signing` without `key_id` when the header is missing.
