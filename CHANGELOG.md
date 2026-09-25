# Changelog

All notable changes to this repository are documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/).
Version numbers, when assigned, are intended to follow [Semantic Versioning](https://semver.org/) independently for the protocol, the core schema, and each extension. See [spec/versioning.md](spec/versioning.md).

The specification is experimental. No stable protocol or schema release has been declared.

## Unreleased

### Added

- Protocol `0.2-draft`: generic HTTP service API (`spec/http-api.md`).
- Resource, operation, challenge, and authorization specifications.
- Wire schemas under `schema/v1/api/`, `schema/v1/operations/`, `schema/v1/challenges/`.
- API examples and SComm MSK signing test vectors under `examples/v1/api/`.
- [signing-key-lookup.md](spec/signing-key-lookup.md): signing-key discovery
  is capability-based and MAY appear as `capabilities.crypto.signing`.
  Verification fetch (`purpose=verification`) still requires `sha256` +
  `key_id`. SComm content-addressable `xxxx-xxxx` key-ids are unchanged.

### Changed

- HTTP service API is now specified; mailbox→origin **resolution** remains unspecified.
- Core Discovery Document schema series remains `1.0` (`capabilities` + `extensions`).
- Versioning distinguishes protocol, HTTP `/v1/`, document schema, and per-type schemas.
- Public Discovery Documents MUST NOT project `capabilities.crypto.verification`.
  Signing keys MAY be projected under `capabilities.crypto.signing` and
  selected with `GET /v1/keys?purpose=signing` without `key_id`.
  `purpose=verification` stays key-id gated.

### Added (earlier)

- Initial Discovery Protocol draft.
- Versioned JSON Schema structure.
- Initial crypto, preferences, forms, and extension capabilities.
- Example discovery documents.
- Schema-validation CI.
