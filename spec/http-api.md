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

A deployment MAY split **read** and **write** hosts (for example a public CDN
read tier and an authenticated write tier). The logical paths are identical;
only the origin differs.

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
digest locally. This hash is a public directory locator, not a vault
capability. Vault OPRF identity is specified outside this document.

## 6. Stable paths

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/mailboxes/{mailboxSha256}` | Public Discovery Document |
| `GET` | `/v1/keys` | Capability-selected encryption key, or **gated** signing key (see §7.1) |
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

**Verification (signing) public key material MUST NOT appear** in this
document. Serving signing keys requires `sha256` + `key_id` as specified in
[signing-key-lookup.md](signing-key-lookup.md). Encryption keys MAY still be
projected for send-side discovery.

Private account state (encrypted vaults, recovery envelopes, device lists) MUST
NOT appear in this response.

## 7.1 Gated signing key GET

`GET /v1/keys?sha256={hex}&key_id={id}&purpose=signing` returns at most one
signing artifact’s public material when both the directory identity and key-id
match a published active signing key.

Omitting `key_id` when `purpose` is `signing` (or `verification`) MUST fail.
Encryption-purpose selection without `key_id` MAY remain capability-based.

## 8. Errors

Error responses use a stable envelope (see
[`api/error.schema.json`](../schema/v1/api/error.schema.json)):

```json
{
  "error": {
    "code": "challenge_expired",
    "message": "The challenge has expired.",
    "details": {}
  }
}
```

Clients MUST treat `error.code` as the machine-readable signal. They MUST NOT
require parsing `message` for control flow.

Recommended HTTP status mapping (non-exhaustive):

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
| `challenge_not_found` | 404 |
| `challenge_expired` | 400 |
| `challenge_failed` | 401 |
| `challenge_already_used` | 409 |
| `rate_limited` | 429 |
| `conflict` | 409 |
| `precondition_failed` | 412 |
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
