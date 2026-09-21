# Security policy

This repository contains an early-draft protocol specification and schemas.
It does not yet define a production authentication, signing, or resolution mechanism.

## Status

**Do not treat this specification as production-ready.** Discovery Documents can influence security-sensitive client behavior (for example, which encryption or verification keys to use). Publication authenticity and secure resolution remain open design areas. See [spec/security-considerations.md](spec/security-considerations.md).

## Reporting a vulnerability

A dedicated security-reporting contact has not been published yet.

Until a production reporting mechanism is established:

- Prefer GitHub's private vulnerability reporting for this repository, if that feature is enabled.
- Do **not** file a public issue that includes a working exploit, private key material, or other details that would make an implementation easier to attack.
- Avoid publishing exploitable security issues until a reporting channel exists.

Reporting instructions will be added before any production use of this protocol is recommended.

## Scope

In-scope examples include:

- Specification ambiguities that would cause implementations to accept forged or substituted cryptographic material.
- Schema designs that prevent clients from distinguishing encryption keys from verification keys.
- Validation gaps that allow obviously malformed Discovery Documents to be treated as valid.

Out of scope until a hosted implementation is specified here:

- Operational issues on any particular discovery service, including `discovery.scomm.ai`, unless they reveal a protocol defect.
