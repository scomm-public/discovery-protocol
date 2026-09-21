# Signing key lookup (gated)

**Protocol version:** `0.2-draft`

## 1. Problem

Publishing every verification (signing) public key in a mailbox Discovery
Document, or returning the “best” signing key from `GET /v1/keys` without a
caller-chosen key identifier, lets a verifier try an unbound set of keys.
That breaks signature–issuer binding and over-discloses signing material.

## 2. Rule

A Discovery service (including `discovery.scomm.ai`) MUST serve **signing /
verification public key material** only when the caller presents **both**:

1. the **SHA-256** (hex) of the **canonical** mailbox address, and  
2. a **valid key-id** for a published signing artifact.

Otherwise the service MUST respond as if no key exists (same error class as
unknown key — typically HTTP `404` with `capability_mismatch` or
`not_found`). It MUST NOT return other signing keys for that mailbox.

## 3. Key-id formats

### 3.1 SComm content-addressable key-id

SComm-generated signing keys use a **content-addressable** key-id:

- Take the **published** `public_material` bytes (decoded from the wire
  base64url form used at upload).
- Compute `SHA-256(public_material)`.
- Take the **first 32 bits** (4 octets) of that digest — a stable commitment
  to the public key’s material (its random / public bits as published).
- Encode as **8 hex digits**, grouped `xxxx-xxxx` (case-insensitive on
  input; servers SHOULD normalize to uppercase for storage/comparison).

Example: `A1B2-C3D4`

Clients MUST embed this key-id on outbound SComm-signed mail (header
`X-Scomm-Signing-Key-Id`) so recipients can auto-pull without listing all
keys.

### 3.2 Other publishers

Other OpenPGP / S/MIME senders (Thunderbird, etc.) MAY register any opaque
key-id string they choose (for example a traditional OpenPGP 64-bit Key ID
or fingerprint fragment), subject to server length limits. Matching is by
exact normalized equality against the id stored with the artifact.

## 4. HTTP

`GET /v1/keys` with `purpose=signing` (or `verification`) MUST require:

| Query | Required |
| --- | --- |
| `sha256` | Yes — hex SHA-256 of the canonical mailbox |
| `key_id` | Yes — SComm `xxxx-xxxx` or publisher-chosen id |
| `purpose` | `signing` (or accepted synonym) |
| `capabilities` | Optional for signing fetch (may be ignored when `key_id` binds the artifact) |

`GET /v1/mailboxes/{mailbox}` MUST NOT project verification public key
material into `capabilities.crypto.verification`. Encryption keys MAY still
appear for send-side discovery.

## 5. Client verify path

1. Detect `multipart/signed`.
2. Read `X-Scomm-Signing-Key-Id`, or a publisher-specific issuer id from the
   signature when that id was registered on the service.
3. `GET /v1/keys?sha256=…&key_id=…&purpose=signing`.
4. Verify locally against the returned material only.

Address-book import of third-party keys (when the sender does not publish on
the service) is a client feature and is out of scope for this lookup rule;
the **default** path remains gated auto-pull from the discovery service.
