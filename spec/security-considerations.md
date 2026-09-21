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

The initial `crypto` schema is provisional. It does not yet define fingerprint binding, revocation, or preference among multiple keys.

### Downgrade attacks

A document might omit stronger algorithms, omit encryption entirely, or advertise weaker families than the mailbox actually supports. Recipients and senders can be nudged toward plaintext or outdated cryptography.

A future authenticity design SHOULD consider how to prevent silent downgrade of previously observed capabilities (for example, authenticated capability snapshots), without this draft inventing that mechanism.

### Stale discovery data

Cached or long-lived documents can advertise revoked keys, outdated forms, or withdrawn policies. Stale data can be as harmful as forged data.

Cache lifetime, revalidation, and revocation are protocol-level issues and are not standardized in `0.1-draft`. Implementations that cache MUST assume they can be wrong.

### Compromised discovery services

A hosted discovery service that stores or serves documents is a high-value target. Compromise can yield mass key substitution, surveillance of lookups (see [privacy.md](privacy.md)), or denial of discovery.

The specification MUST remain implementable with self-hosted and multi-vendor services so that compromise of one operator is not compromise of the protocol.

### Cache poisoning

Resolvers, HTTP caches, DNS caches, and local client caches can be poisoned independently of origin authenticity. A future resolution specification SHOULD address integrity of both the lookup path and the document body.

### Mailbox impersonation

Discovery is mailbox-centric. If resolution can be pointed at the wrong mailbox's document, or if `mailbox` inside the document is not bound to the lookup key, clients may apply Alice's keys to Bob's address (or an attacker's).

A future specification MUST bind the retrieved document to the mailbox that was queried. This draft only requires that documents *contain* a `mailbox` field; it does not yet say how that field is verified.

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

## What this draft does not specify

The following are explicit non-goals for protocol `0.1-draft`:

- document signatures or Merkle / transparency proofs;
- TLS requirements for a particular resolver;
- DNSSEC or HTTPS well-known lookup rules;
- key discovery via Web Key Directory or similar as a mandatory mechanism;
- trust-on-first-use vs TOFU-pinning policies.

Implementers MAY experiment, but MUST NOT claim conformance to a Discovery authenticity profile that this repository has not defined.

## Guidance for experimental implementations

- Distinguish **schema validity** from **trust**.
- Keep encryption and verification key lists separate in APIs and UI.
- Ignore unknown extensions by default.
- Copy core schemas into clients; do not require `discovery.scomm.ai` at validation time.
- Log and display the source of a document (file, test resolver, network) to developers.
