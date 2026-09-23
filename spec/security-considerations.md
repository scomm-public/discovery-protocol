# Security considerations

Discovery information may directly influence security-sensitive client behavior: which keys to encrypt to, which keys to trust for signatures, which URLs to open, which forms to submit, and which policies to apply. A structurally valid Discovery Document is not automatically trustworthy.

This document catalogs risks. It does **not** specify the final signing, authentication, or resolution mechanism. Publication authenticity and secure resolution are **open design areas** and MUST be specified before production use is recommended.

## Threats

### Forged Discovery Documents

An attacker who can supply a document for a mailbox can misrepresent capabilities. Clients that treat an unsigned or unauthenticated document as authoritative can be tricked into using attacker-chosen keys, forms, or policy text.

Until authenticity is specified, implementations SHOULD treat documents from experimental or unverified sources as untrusted hints, not as ground truth.

### Key substitution

Encryption and verification are separate roles. An attacker may try to:

- replace encryption keys so that ciphertext is readable by the attacker;
- replace verification keys so that attacker-signed mail verifies;
- present a verification key in an encryption slot, or the reverse, hoping a careless client conflates roles.

Clients MUST use keys only for the role under which they were published, unless a later crypto profile defines a safe dual-use rule.

### Unbound signing-key disclosure (forbidden)

Returning **all** (or an arbitrary “best”) **signing / verification** public
keys for a mailbox to a caller that only knows the address — including via
`GET /v1/mailboxes/{mailboxSha256}` or `GET /v1/keys` without `key_id` — is a
**security breach** relative to signature verification:

- Verifiers MUST bind to the **key-id of the key that signed the message**,
  not try every published signing key until one verifies.
- Discovery services MUST require **both** mailboxSha256 and a
  **valid key-id** before returning signing public key material.

See [signing-key-lookup.md](signing-key-lookup.md). SComm key-ids are
content-addressable (`xxxx-xxxx` from the first 32 bits of
`SHA-256(public_material)`). Other publishers MAY register their own ids.

The initial `crypto` schema is provisional. Revocation and authenticated
document authenticity remain open design areas.

### Downgrade attacks

A document might omit stronger algorithms, omit encryption entirely, or advertise weaker families than the mailbox actually supports. Recipients and senders can be nudged toward plaintext or outdated cryptography.

A future authenticity design SHOULD consider how to prevent silent downgrade of previously observed capabilities (for example, authenticated capability snapshots), without this draft inventing that mechanism.

### Stale discovery data

Cached or long-lived documents can advertise revoked keys, outdated forms, or withdrawn policies. Stale data can be as harmful as forged data.

Cache lifetime, revalidation, and revocation are protocol-level issues and are not fully standardized in `0.2-draft`. Implementations that cache MUST assume they can be wrong.

### Compromised discovery services

A hosted discovery service that stores or serves documents is a high-value target. Compromise can yield mass key substitution, surveillance of lookups (see [privacy.md](privacy.md)), or denial of discovery.

The specification MUST remain implementable with self-hosted and multi-vendor services so that compromise of one operator is not compromise of the protocol.

### Cache poisoning

Resolvers, HTTP caches, DNS caches, and local client caches can be poisoned independently of origin authenticity. A future resolution specification SHOULD address integrity of both the lookup path and the document body.

### Mailbox impersonation

Discovery is mailbox-centric. If resolution can be pointed at the wrong mailbox's document, or if `mailbox` inside the document is not bound to the lookup key, clients may apply Alice's keys to Bob's address (or an attacker's).

A future specification MUST bind the retrieved document to the mailboxSha256 that was queried. Documents contain `mailboxSha256` and do not contain a mailbox address.

### Malicious extension data

Extensions are open-world JSON objects. They MAY contain unexpected types nested inside, huge strings, or URLs. Clients MUST NOT treat unknown extensions as executable configuration.

### Oversized payloads

Documents, inline keys, or future inline schemas can be large enough to exhaust memory or CPU during JSON parsing and schema validation. Implementations SHOULD impose local size and time limits. This draft does not set interoperability maxima yet.

### Malicious URLs

Forms may include `schema` and `web` URIs. Keys MAY later include external references. Extensions MAY include URLs.

Fetching those URLs can expose the client IP, leak the intent to communicate, or load hostile content (HTML, scripts, gigantic schemas). Clients SHOULD apply URL allowlists, scheme restrictions (`https`), user confirmation, and sandboxing for web forms. They MUST NOT fetch extension URLs merely because they are present.

### Schema abuse

JSON Schema itself can be expensive to validate (pathological patterns, huge `enum` lists, deeply nested schemas) if a client later fetches **form** schemas from the network. Clients SHOULD validate form schemas with resource limits. The core Discovery schemas in this repository are small and should be loaded from local copies in production clients.

### Privacy leakage from discovery queries

Looking up a mailbox can reveal that a client intends to communicate with that mailbox. See [privacy.md](privacy.md). This is a security and privacy issue: query logs enable surveillance and correlation.

## HTTP service API threats (`0.2-draft`)

The generic HTTP API ([http-api.md](http-api.md)) increases flexibility. Implementations MUST preserve these invariants:

### Type confusion

A client MUST NOT be able to reinterpret a signed payload for one operation or resource type as another. Signatures in the SComm MSK profile bind `operation` and `payload_sha256` (see [authorization.md](authorization.md)).

### Schema / version substitution

Servers MUST validate resource and operation payloads against the registered schema for the declared type and version. Reject `unsupported_type`, `unsupported_version`, and `schema_validation_failed` rather than coercing.

### Authorization-profile confusion

A satisfied challenge MUST remain purpose-bound. Challenge proofs MUST NOT escalate into unrelated operations (for example OTP for MSK replace authorizing vault upload).

### Replay and cross-mailbox reuse

Signed requests MUST bind principal (mailbox identity), timestamp (bounded skew), and nonce. Cross-mailbox reuse of a signature MUST fail.

### Challenge abuse

Email OTP challenges MUST rate-limit creation, expire, bound attempts, and never return the OTP in API responses. OTP flooding and brute force MUST be mitigated.

### Private / public visibility mistakes

Private vault ciphertext, recovery envelopes, and device inventories MUST NOT be projected into `GET /v1/mailboxes/{mailboxSha256}`.

### Idempotency abuse

Retries MUST NOT double-apply MSK rotation or unbounded challenge issuance. Prefer signed nonce replay protection and `Idempotency-Key` on creates.

### Oversized generic JSON

Servers SHOULD enforce size limits on generic resource/operation bodies independent of schema validity.

### Unknown type handling

Unknown optional public types SHOULD be ignored by tolerant readers. Unknown types on write SHOULD fail closed when the server does not support them.

## What this draft does not specify

The following remain non-goals for protocol `0.2-draft` authenticity of *public documents* and resolution:

- document signatures or Merkle / transparency proofs for Discovery Documents;
- mandatory DNSSEC or HTTPS well-known lookup rules;
- key discovery via Web Key Directory as a mandatory mechanism;
- trust-on-first-use vs TOFU-pinning policies for resolution.

The HTTP API and SComm MSK hosted authorization profile **are** specified. Implementers MAY experiment with additional authenticity layers, but MUST NOT claim conformance to a Discovery authenticity profile that this repository has not defined.

## Guidance for experimental implementations

- Distinguish **schema validity** from **trust**.
- Keep encryption and verification key lists separate in APIs and UI.
- Ignore unknown extensions by default.
- Copy core schemas into clients; do not require `discovery.scomm.ai` at validation time.
- Log and display the source of a document (file, test resolver, network) to developers.
- Treat MSK as a hosted-service authorization profile, not as the only possible Discovery management identity.
