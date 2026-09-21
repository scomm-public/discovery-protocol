# Specifications

These documents define the Discovery Protocol independently of any hosted service or client.

| Document | Contents |
| --- | --- |
| [protocol.md](protocol.md) | Mailbox-centric model, Discovery Documents, capabilities, validation, and unresolved resolution |
| [http-api.md](http-api.md) | Stable HTTP service API (`/v1/`), errors, idempotency |
| [resources.md](resources.md) | Resource envelopes, visibility, projection to capabilities |
| [operations.md](operations.md) | Generic operations for state transitions |
| [challenges.md](challenges.md) | Generic challenges (email OTP as first type) |
| [authorization.md](authorization.md) | Authorization profiles (MSK hosted profile) |
| [versioning.md](versioning.md) | Protocol vs HTTP API vs core schema vs extension versions |
| [extensions.md](extensions.md) | URI-namespaced third-party capabilities |
| [security-considerations.md](security-considerations.md) | Attacks, authenticity, and open cryptographic design questions |
| [privacy.md](privacy.md) | Lookup leakage and privacy-preserving resolution as future work |

JSON Schemas in [`../schema/v1`](../schema/v1) are the normative structural definition of Discovery Documents for core schema series `1.x` as currently drafted.

Normative keywords: when these documents use `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY`, they follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174). This repository is a **project draft**, not an IETF RFC.
