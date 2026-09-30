# Key lifecycle

**Protocol version:** `0.2-draft`

**Status:** Draft

This document is the authoritative lifecycle model for SComm mail keys
(signing and encryption). It applies to Discovery, the vault profile, SDKs,
servers, and applications such as Scomm.AI.

The master signing key (MSK) has its own arm and replace lifecycle. The MSK
authorizes the events in this document. It is not a mail-key status.

Normative keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)
and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).

## 1. Independent dimensions

A conforming implementation MUST model these dimensions separately. It MUST
NOT infer one solely from another.

| Dimension | Values |
| --- | --- |
| Purpose | `signing` (`SIGN`), `encryption` (`ENCRYPT`) |
| Cryptographic lifecycle | `created`, `active`, `retired`, `revoked` |
| Validity | `not_before`, `not_after` |
| Discovery publication | `unpublished`, `published`, `withdrawn`, `tombstoned` |
| Vault material | `hot`, `archived`, `destroyed` |
| Policy | `preferred`, `suspended`, and similar flags |
| Relationship | `supersedes`, `superseded_by` |

`verify` and `decrypt` are operations, not purposes.

```text
SIGN private key    → purpose signing, operation sign
SIGN public key     → purpose signing, operation verify
ENCRYPT public key  → purpose encryption, operation encrypt
ENCRYPT private key → purpose encryption, operation decrypt
```

Stored directory purpose values are `signing` and `encryption`.
`GET /v1/keys?purpose=verify` is the verify operation against a signing
public key. It is not a stored purpose. `purpose=signing` on that GET
MUST fail. See [signing-key-lookup.md](signing-key-lookup.md).

A directory artifact MUST have exactly one purpose. A local OpenPGP key
MAY contain both a signing primary and an encryption subkey when the
protocol requires it. Each published artifact is still one purpose.

These pairs are not synonyms:

```text
withdrawn  ≠ revoked
destroyed  ≠ revoked
retired    ≠ archived
expired    ≠ retired
revoked    ≠ destroyed
```

Retirement stops new use. Revocation withdraws trust for new use. Expiry
comes from validity. Archival changes storage. Withdrawal changes
publication. Destruction removes private material.

## 2. Identity

A key is one cryptographic object identified by a stable `scomm_key_id`.
That id MUST NOT be reused for different public material. Rotation MUST
allocate a new id. See [signing-key-lookup.md](signing-key-lookup.md).

## 3. Cryptographic lifecycle

```text
created ──activate──▶ active ──retire──▶ retired
                         │                  │
                         └──── revoke ──────┴──▶ revoked
```

Transitions are forward-only. These MUST be rejected:

```text
revoked → active
revoked → retired
retired → active
active  → created
```

A new operational period after retirement or revocation MUST use a new key id.

`created` means the key exists but is not authorized for normal use. A
created signing key MUST NOT create normal outgoing signatures. A created
encryption key MUST NOT be advertised as an encryption destination.

The hosted directory inserts a row at activation. `created_at` and
`activated_at` MUST be distinct fields. They MAY be equal when create and
activate succeed in one publish. `crypto_created_at` MAY differ from both
when the underlying object has its own creation time.

A client MUST NOT call `set_encryption_key` until durable private material
exists for that key.

`active` means the key is authorized for current operations of its purpose.
More than one key MAY be active. Clients SHOULD choose a preferred key for
a capability tuple `(identity, protocol, purpose, algorithm family)`.
`preferred` MUST NOT retire, revoke, or change validity.

`retired` means the key was operational and is no longer for new material.
Retirement MUST NOT imply compromise and MUST NOT invalidate historical
operations.

- A retired signing key MUST NOT create new signatures. Verifying an old
  signature MAY succeed. The signing private key is not required to verify.
- A retired encryption key MUST NOT encrypt new content. Decrypting existing
  content MAY succeed. The private key SHOULD be retained.

`revoked` means an authorized party declared the key must not be relied on
for new operations. Revocation is irreversible. A revoked key MUST record
`revoked_at` and a `revocation_reason`. A replacement is a new key.

Initial reason codes:

```text
UNSPECIFIED
KEY_COMPROMISE
DEVICE_COMPROMISE
SUPERSEDED
ALGORITHM_DEPRECATED
AFFILIATION_CHANGED
IDENTITY_REVOKED
CERTIFICATE_REVOKED
OWNER_REQUEST
ADMINISTRATIVE
```

`SUPERSEDED` as a revocation reason is not a lifecycle state. Normal
rotation uses retirement reason `ROTATION` and the supersession link.

`compromised` MUST NOT be a lifecycle state. Compromise is
`revoked` plus `KEY_COMPROMISE` or `DEVICE_COMPROMISE`. CKVF containers
MAY still store the legacy status `compromised`. Applications MUST project
that value as lifecycle `revoked` and reason `KEY_COMPROMISE`.

Revocation MUST NOT by itself destroy private material or erase a signing
public key.

- New signatures and new encryption to a revoked key MUST NOT be selected.
- Historical verification MUST still be able to evaluate the signature and
  MUST report lifecycle separately from the cryptographic result.
- A revoked encryption private key MAY decrypt historical ciphertext while
  material remains available.

A client MUST NOT treat a claimed message time earlier than `revoked_at`
as proof the signature predates compromise unless a trusted timestamp says
so.

## 4. Validity and effective status

`expired` is not a lifecycle transition. Validity is `not_before` and
`not_after`. After `not_after`, an SDK MAY derive effective status
`expired` without rewriting lifecycle. This matters for S/MIME: certificate
validity and SComm lifecycle are independent. OpenPGP revocation inside a
certificate is likewise independent and MUST NOT silently rewrite an
MSK-authorized SComm history.

Effective status is derived and MUST NOT replace stored fields:

```text
if lifecycle is revoked:        revoked
else if now < not_before:       not_yet_valid
else if now > not_after:        expired
else if lifecycle is retired:   retired
else if policy.suspended:       suspended
else:                           lifecycle
```

Suspension is policy. It MAY be reversed. Revocation MUST NOT be reversed.

## 5. Rotation

Rotation MUST create a new key id. It MUST NOT overwrite material bound to
the old id.

```text
K1 active
K2 created → active
K1 retired
K1.superseded_by = K2
K2.supersedes = K1
```

Encryption rotation SHOULD run in this order:

1. Generate K2.
2. Persist K2 private material.
3. Confirm durable decrypt capability.
4. Authorize and activate K2.
5. Publish K2.
6. Prefer K2.
7. Withdraw K1 from ordinary encryption discovery.
8. Retire K1.
9. Retain K1 private material.

Failure MUST NOT leave the identity with no usable key when that can be
avoided. Retries MUST be idempotent.

## 6. Discovery publication

Publication is independent of lifecycle. Discovery MAY retain
`published` + `retired` and `published` + `revoked` so old signatures
remain verifiable.

| State | Meaning |
| --- | --- |
| `unpublished` | No public object is currently published. The key MAY exist in the vault. |
| `published` | Public material is available through Discovery. |
| `withdrawn` | Public bytes are no longer offered for ordinary discovery. The id and a hash of the removed bytes remain. This is not revocation. |
| `tombstoned` | The public bytes are gone. Non-secret history (id, fingerprint, purpose, lifecycle, times) remains so deletion cannot rewrite history. |

`retire_key` MUST NOT change publication and MUST NOT clear
`public_material`.

`withdraw_key` sets `withdrawn`, clears public bytes, and keeps
`scomm_key_id` and `material_sha256`. It MUST NOT change lifecycle.

A purge MAY later set `tombstoned`. For signing publics that stay
`published` after retire, that purge MUST NOT run before 10 years after
`retired_at`. Tombstone is not a lifecycle change.

`revoke_key` MUST NOT clear signing public material. Current-key selection
excludes the revoked key. Historical verify fetch MUST still return it
while publication is `published`.

Ordinary encryption discovery MUST NOT return keys that are `created`,
`retired`, `revoked`, expired, suspended, withdrawn, or tombstoned.
Historical lookup is a separate request. See
[signing-key-lookup.md](signing-key-lookup.md).

When an encryption successor is published, the server MUST retire the prior
same-family encryption artifact with reason `ROTATION`, record
`superseded_by`, and withdraw its public bytes in that same authorized
publish. That bundled withdraw is the rotation step, not a meaning of the
word retired. A signing successor publish MUST NOT retire or withdraw the
predecessor.

Discovery MUST NOT receive private key material.

There is no single `deleteKey` operation. The operations are `retire_key`,
`revoke_key`, and `withdraw_key`. Private destruction is a vault operation,
not a directory operation.

## 7. Vault material

| State | Meaning |
| --- | --- |
| `hot` | Private material is available on the normal vault path. Valid with `active`, `retired`, or `revoked`. |
| `archived` | Private material is retained outside the normal working set, same `key_id`. Restore returns `hot` and MUST NOT activate the key. Cold archive is not part of CKVF 1.0. |
| `destroyed` | Usable private material is gone. Lifecycle history remains. |

`retire_key` and `revoke_key` MUST NOT destroy private material.

Destroying an encryption private key can make ciphertext permanently
undecryptable. Applications MUST treat it as a separate, explicit,
high-risk action. They MUST NOT describe retirement as deletion.

A retired signing private key is not required for verification. A later
explicit destroy MAY remove it while public material, fingerprint, and
lifecycle remain.

Removing a local cache is not vault destruction and not revocation.

CKVF `status` (`active`, `retired`, `revoked`, `compromised`) is the
container's lifecycle projection. It is not publication state.
`DELETE_PRIVATE_KEY` is destruction. The SComm profile MUST NOT use
extension `std:signing-key-retention` policy `delete-on-retire`, because
that policy destroys a signing private key when the record leaves `active`.
See the CKVF SComm key-lifecycle profile.

## 8. Capabilities

SDKs SHOULD expose operation capabilities rather than one `isUsable` flag.

| Lifecycle | canSignNow | canVerify | canEncryptNow | canDecrypt |
| --- | --- | --- | --- | --- |
| active signing | yes | yes | no | no |
| retired signing | no | yes, if public material remains | no | no |
| revoked signing | no | evaluable; report revoked | no | no |
| active encryption | no | no | yes | yes, if private material remains |
| retired encryption | no | no | no | yes, if private material remains |
| revoked encryption | no | no | no | allowed by policy if private material remains |

## 9. Ordering, authorization, and privacy

Each lifecycle change MUST carry a monotonic `lifecycle_sequence`. Clients
and servers MUST NOT let a stale sequence overwrite a newer one. Wall-clock
time MUST NOT be the only order. Timestamps record when the directory
accepted the event. They do not prove generation time, possession, absence
of compromise, or legal non-repudiation.

`retire_key`, `revoke_key`, `withdraw_key`, rotation publish, and vault
`DELETE_PRIVATE_KEY` MUST be authorized. Where the MSK profile applies, the
directory operations MUST be MSK-signed. The server MUST reject a replayed
nonce and a sequence that is not newer, except that an idempotent retry of
the same authorized retire or revoke MUST NOT append a second transition.

An append-only `key_events` log and `previous_event_hash` SHOULD be added
later. Until that log exists, the artifact row is the current projection
and `lifecycle_sequence` on that row is authoritative.

Discovery responses for a current key SHOULD include key id, fingerprint,
purpose, protocol, algorithm, public material, lifecycle status, validity
when known, and lifecycle sequence. Historical and revocation responses
SHOULD add reason and supersession when present. Vault device identifiers
and usage counts MUST NOT appear on public Discovery.

Deleting a mailbox identity MUST NOT by itself erase key history.

## 10. Conformance invariants

1. A `scomm_key_id` is never reused for different material.
2. Revocation is irreversible.
3. Rotation creates a new id.
4. Retirement does not imply compromise.
5. Retirement does not destroy private material.
6. Revocation does not destroy private material.
7. Withdrawal does not revoke.
8. Vault destruction does not erase lifecycle records.
9. Expiry does not rewrite lifecycle.
10. Archival does not change lifecycle.
11. A retired or revoked key is not selected for new encryption.
12. A retired or revoked signing key does not create new signatures.
13. A retired encryption private key MAY decrypt old mail.
14. A revoked encryption private key MAY decrypt old mail.
15. Historical verification does not require the signing private key.
16. Cryptographic validity and lifecycle are separately representable.
17. Private-material destruction is explicit.
18. Discovery never exposes private key material.
19. Lifecycle order does not depend only on wall-clock time.
20. Stale lifecycle data does not overwrite a newer sequence.

Structural enums are in
[`schema/v1/key-lifecycle.schema.json`](../schema/v1/key-lifecycle.schema.json).
