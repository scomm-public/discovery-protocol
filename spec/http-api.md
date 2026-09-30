# HTTP service API

**Document status:** Early draft  
**Protocol version described here:** `0.2-draft`  
**HTTP API major version:** `1` (paths under `/v1/`)

This document specifies the **HTTP service API** for a Discovery Protocol
implementation that publishes and manages mailbox Discovery Documents.

It does **not** specify how a client maps an arbitrary Internet mailbox to the
authoritative discovery service (DNS, well-known, provider delegation, etc.).
Resolution remains future work. See [protocol.md](protocol.md) § Future
resolution.

`discovery.scomm.ai` MAY implement this API. The API is vendor-neutral: any
compatible service MAY implement it.

## 1. Design principle

Protocol extensibility SHOULD normally occur through versioned **resource
types**, **operation types**, **challenge types**, **schemas**, and
**authorization profiles** rather than through capability-specific HTTP
endpoints.

The HTTP surface under `/v1/` is intentionally small and stable. Independently
versioned resource and operation schemas ride on the same transport major
version.

## 2. API major version vs document schema version

| Identifier | Meaning |
| --- | --- |
| `/v1/` path prefix | HTTP API major version 1 |
| Protocol `0.2-draft` | Normative behavior including this HTTP API |
| Document `schemaVersion` `"1.0"` | Core Discovery Document vocabulary |
| Resource / operation / challenge `schemaVersion` | Per-type payload vocabulary |

Clients MUST NOT assume that `/v1/` implies only document schema `1.0`, or that
all resource types share one schema version forever.

## 3. Hosts

Directory and mailer share one origin. Vault is a different origin and is not
part of this document.

| Mode | Directory and mailer | Vault |
| --- | --- | --- |
| Debug | `http://127.0.0.1:3000` | `http://127.0.0.1:3001` |
| Production | `https://discovery.scomm.ai` | `https://vault.scomm.ai` |

`GET /v1/keys` and `GET /v1/mailboxes/{mailboxSha256}` are served by the
directory origin. Mailbox proofs use
`POST /v1/mailboxes/{mailboxSha256}/challenges` on that same origin. Vault
routes are not mounted there.

A deployment MAY still split directory read and write tiers. The logical
directory paths stay the same; only the directory origin differs.

Typical mapping:

| Methods | Host role |
| --- | --- |
| Public `GET /v1/mailboxes/{mailboxSha256}` | Read |
| Authenticated resource / operation / challenge mutations | Write |

## 4. Content types

Requests and responses use `application/json` unless otherwise noted.

Implementations MAY accept `Accept: application/json`. Custom media types such
as `application/discovery+json` are not required in this draft.

## 5. Directory path parameters

`{mailboxSha256}` is 64 lowercase hexadecimal characters:
`SHA-256(UTF-8(canonical mailbox))`. The mailbox address is not a path
parameter and MUST NOT appear in discovery URLs. Clients compute the
digest locally. The same digest is the vault `identity_id`; there is no
separate identity OPRF.

## 6. Stable paths

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/mailboxes/{mailboxSha256}` | Public Discovery Document |
| `GET` | `/v1/keys` | Capability-selected encryption key, or **gated** verify key (see §7.1) |
| `GET` | `/v1/mailboxes/{mailboxSha256}/resources` | List managed resources (auth; visibility-filtered) |
| `GET` | `/v1/mailboxes/{mailboxSha256}/resources/{resourceType}` | Get resources of a type |
| `POST` | `/v1/mailboxes/{mailboxSha256}/resources` | Create a resource |
| `PATCH` | `/v1/mailboxes/{mailboxSha256}/resources/{resourceId}` | JSON Merge Patch (RFC 7396) |
| `DELETE` | `/v1/mailboxes/{mailboxSha256}/resources/{resourceId}` | Delete or retire a resource |
| `POST` | `/v1/mailboxes/{mailboxSha256}/operations` | Execute an operation |
| `POST` | `/v1/mailboxes/{mailboxSha256}/challenges` | Create a challenge |
| `POST` | `/v1/mailboxes/{mailboxSha256}/challenges/{challengeId}/responses` | Respond to a challenge |
| `GET` | `/v1/mailboxes/{mailboxSha256}/challenges/{challengeId}` | Challenge status (no secrets) |

See [resources.md](resources.md), [operations.md](operations.md),
[challenges.md](challenges.md), [authorization.md](authorization.md), and
[signing-key-lookup.md](signing-key-lookup.md).

## 7. Public mailbox GET

`GET /v1/mailboxes/{mailboxSha256}` returns a Discovery Document conforming to
[`discovery.schema.json`](../schema/v1/discovery.schema.json).

The document MUST include `schemaVersion` and `mailboxSha256`. Public cryptographic
material, preferences, forms, and extensions appear under `capabilities` and
`extensions` as projected by the implementation.

**Signing keys and verification public keys MUST NOT appear** in this
document. A signing key is a private key and is not a discovery resource.
Encryption keys MAY appear under `capabilities.crypto.encryption`. Gated
verification fetch is specified in [signing-key-lookup.md](signing-key-lookup.md).

Private account state (encrypted vaults, recovery envelopes, device lists) MUST
NOT appear in this response.

## 7.1 Verification key GET

`GET /v1/keys` with `purpose=signing` MUST fail. Signing keys are private
and are not served by Discovery. The public purpose is `verify`.

`GET /v1/keys?sha256={hex}&key_id={id}&purpose=verify` returns at most
one verify public key when both the unsalted mailbox hash and key-id
match. `{id}` is the `scomm_key_id` (16 hex digits, 8 octets). The
response member is `scomm_key_id`. Responses MUST NOT include `key_id`.
`{hex}` is `SHA-256(UTF-8(canonical mailbox))`, the same digest used as
vault `identity_id`. Omitting `key_id` when `purpose` is `verify` MUST fail.

Encryption-purpose selection without `key_id` remains capability-based.

## 7.2 MSK public key GET

`GET /v1/msk?sha256={hex}` returns the one armed master signing public key
for that unsalted mailbox hash, plus replaced public keys so older vault
signatures remain verifiable. `{hex}` is `SHA-256(UTF-8(canonical mailbox))`.

```json
{
  "identity_id": "<64 hex sha256>",
  "algorithm": "ed25519",
  "public_key": "<base64url>",
  "archived_public_keys": [
    { "algorithm": "ed25519", "public_key": "<base64url>" }
  ]
}
```

`algorithm` is `ed25519` or `mldsa65-ed25519`. The response echoes the
`sha256` that was asked for as `identity_id`. It MUST NOT include the
mailbox address, the seed, a device list, or a pending key. No armed key
is `404 not_found` (lookup miss; see [errors.md](errors.md)). This key is
not part of the Discovery Document.

## 8. Errors

Error responses use a stable envelope (see
[`api/error.schema.json`](../schema/v1/api/error.schema.json) and
[errors.md](errors.md)):

```json
{
  "error": {
    "code": "challenge_expired",
    "message": "The challenge has expired."
  }
}
```

Clients MUST treat `error.code` as the machine-readable signal. They MUST NOT
require parsing `message` for control flow.

Reject classes, weights for a DoS agent, and the `http_reject` log line are
normative in [errors.md](errors.md). Recommended HTTP status mapping
(non-exhaustive):

| Code | Typical status |
| --- | --- |
| `invalid_request` | 400 |
| `unsupported_type` | 400 |
| `unsupported_version` | 400 |
| `schema_validation_failed` | 400 |
| `not_found` | 404 |
| `unauthorized` | 401 |
| `invalid_signature` | 401 |
| `expired_signature` | 401 |
| `replay_detected` | 401 |
| `challenge_expired` | 400 |
| `challenge_failed` | 401 |
| `challenge_already_used` | 409 |
| `rate_limited` | 429 |
| `conflict` | 409 |
| `precondition_failed` | 412 |
| `payload_too_large` | 413 |
| `internal_error` | 500 |

## 9. Idempotency

Clients SHOULD send `Idempotency-Key: <opaque>` on:

- `POST …/resources`
- `POST …/operations`
- `POST …/challenges`

MSK-signed requests already bind a `nonce`; replaying the same signed envelope
MUST NOT apply a second mutation (replay rejection or idempotent success).

Challenge creation without an idempotency key MAY be rate-limited to prevent
OTP flooding.

## 10. Concurrency

This draft does not require `ETag` / `If-Match` for all resources. Append-only
crypto artifact publish/retire models MAY omit optimistic concurrency.
Mutable preferences and forms MAY adopt revision tokens in a later minor
revision.

## 11. Relationship to resolution

Obtaining a Discovery Document via this HTTP API presupposes that the client
already knows which service origin to call. How that origin is discovered for
an arbitrary mailbox is **not** specified here.
