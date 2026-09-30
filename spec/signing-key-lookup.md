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

### 3.1 How `scomm_key_id` is calculated

`scomm_key_id` is the last **8 octets** of the key fingerprint, written as
**16 uppercase hexadecimal digits**. Comparison is case-insensitive and
ignores spaces, colons, and hyphens. The canonical stored form has no
separators.

Example: `A1B2C3D4E5F67890`

Those 8 octets are the trailing bytes of a hash. They are not a header or
a footer of the key encoding.

**OpenPGP** (classical ECC and PQC, including Ed25519, Cv25519,
ML-DSA-65+Ed25519, and ML-KEM-768+X25519). The fingerprint is the OpenPGP
fingerprint of the key packet that performs the operation, the same value
Sequoia uses as the Key ID:

- Version 4 key packet: SHA-1 of `0x99 || uint16be(body length) || body`.
  The body starts at the version octet. The fingerprint is 20 octets.
- Version 6 key packet: SHA-256 of `0x9b || uint32be(body length) || body`.
  The fingerprint is 32 octets.
- The key-id is the last 8 octets of that fingerprint.

A verify artifact uses the primary key (packet tag 6). An encryption or
key-agreement artifact uses the encryption subkey (packet tag 14). A
certificate that contains only one key packet uses that packet. This is the
Key ID Sequoia writes in a signature's issuer field or in a public-key
encrypted session key packet.

**S/MIME and any other published material** (RSA, X25519, ML-DSA-65,
ML-KEM, and bare SPKI). There is no OpenPGP fingerprint. The fingerprint is
`SHA-256` of the published `public_material` bytes. The key-id is the last
8 octets of that 32-octet digest. Armor text, when it is part of those
bytes, is hashed as input and does not appear at the end of the digest.

Clients MUST embed this key-id on outbound SComm-signed mail (header
`X-Scomm-Signing-Key-Id`) so recipients can fetch the verification key
without listing keys. The service derives the same value on upload. A
client-supplied `scomm_key_id` that does not match MUST be rejected.

### 3.2 Responses use `scomm_key_id`

The only public key identifier is `scomm_key_id`: 16 uppercase hexadecimal
digits, the 8 octets from §3.1. JSON responses MUST include `scomm_key_id`
and MUST NOT include `key_id`. `key_id` is the service's private generation
counter. It is not a publisher-chosen id and it is not returned.

A client MAY omit `scomm_key_id` on upload; the service derives it. A
client-supplied `scomm_key_id` that does not match the derivation MUST be
rejected.

Publishing a **different** public key whose derived id matches a key already
stored for that mailbox MUST be rejected (`scomm_key_id_collision`).
Publishing the same public key again is not a collision. After encryption
material is removed, the service keeps the id and a full hash of those bytes
so the same key can be published again and a different key cannot reuse the id.

## 4. HTTP

| Query | `purpose=signing` | `purpose=verify` |
| --- | --- | --- |
| `sha256` | Request MUST fail | Required — unsalted mailbox hash |
| `key_id` | Not used | Required query value — the `scomm_key_id`, 16 hex digits |
| `capabilities` | Not used | Ignored when `key_id` binds the artifact |

## 5. Retention and lifecycle

A signature outlives the key that made it. Lifecycle, publication, and
private-material state are independent. See [key-lifecycle.md](key-lifecycle.md).

- Publishing a successor signing key does not retire or withdraw the
  predecessor. The predecessor stays `active` and `published` until an
  explicit `retire_key`, `revoke_key`, or `withdraw_key`.
- `retire_key` sets lifecycle `retired` and `retired_at`. It does not clear
  public material and it does not destroy the private key.
- While publication stays `published`, retired and revoked verify material
  MUST remain fetchable by `key_id`. A purge MUST NOT tombstone that
  material before 10 years after `retired_at`. Tombstone clears bytes and
  keeps the id and material hash. It does not change lifecycle.
- `revoke_key` sets lifecycle `revoked`, `revoked_at`, and
  `revocation_reason`. Signing public material stays while `published`.
  Compromise is reason `KEY_COMPROMISE` or `DEVICE_COMPROMISE`, not a
  separate status.
- `withdraw_key` sets publication `withdrawn` and clears public bytes. It
  does not retire or revoke.

The verify response includes lifecycle so clients can judge old signatures:

| Member | Meaning |
| --- | --- |
| `status` | Lifecycle: `active`, `retired`, or `revoked` |
| `lifecycle_sequence` | Monotonic order. A stale sequence loses. |
| `revocation_reason` | Present when `status` is `revoked` |
| `created_at` | ISO 8601 time the row was created |
| `retired_at` | Present when `status` is `retired` or `revoked` |
| `revoked_at` | Present when `status` is `revoked` |

Cryptographic validity and lifecycle are separate results. A client MAY
accept a signature from a `retired` key. A client MUST surface `revoked`
rather than treating revocation as a failed signature check. A claimed
message time before `revoked_at` is not proof the signature predates
compromise.

Encryption and key-agreement keys are not verify material. Ordinary
encryption discovery returns only `active` keys with published bytes.
Publishing a successor retires the prior same-family encryption artifact
with reason `ROTATION` and withdraws its public bytes. The `scomm_key_id`
and a hash of the removed bytes remain. The private key stays in the vault
until an explicit destroy. `retire_key` alone does not withdraw those bytes;
current-key selection still excludes `retired` and `revoked`.

## 6. Client verify path

1. Detect `multipart/signed`.
2. Read `X-Scomm-Signing-Key-Id`. That header is the `scomm_key_id`.
3. `GET /v1/keys?sha256=…&key_id=…&purpose=verify`, where `sha256` is the
   unsalted mailbox hash.
4. Verify locally against the returned public material only, then apply the
   lifecycle rules of §5. Report the cryptographic result and `status`
   separately.

Do not call `purpose=signing`. Do not use the vault OPRF identity as
`sha256`. Do not fall back to an unbound key list when the header is missing.
