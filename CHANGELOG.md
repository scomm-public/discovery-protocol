# Changelog

All notable changes to this repository are documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/).
Version numbers, when assigned, are intended to follow [Semantic Versioning](https://semver.org/) independently for the protocol, the core schema, and each extension. See [spec/versioning.md](spec/versioning.md).

The specification is experimental. No stable protocol or schema release has been declared.

## Unreleased

### Added

- [errors.md](spec/errors.md): 4xx reject classes and weights for a DoS
  agent, existence-hiding `404 not_found`, and the `http_reject` log
  line. Vault `identity_id` is the unsalted mailbox SHA-256; there is
  no identity OPRF.
- [key-lifecycle.md](spec/key-lifecycle.md) and
  `schema/v1/key-lifecycle.schema.json`. Cryptographic lifecycle,
  publication, and vault material are separate. `retire_key` does not
  withdraw or destroy. `revoke_key` and `withdraw_key` are separate
  MSK-signed operations.
- Protocol `0.2-draft`: generic HTTP service API (`spec/http-api.md`).
- Resource, operation, challenge, and authorization specifications.
- Wire schemas under `schema/v1/api/`, `schema/v1/operations/`, `schema/v1/challenges/`.
- API examples and SComm MSK signing test vectors under `examples/v1/api/`.
- [signing-key-lookup.md](spec/signing-key-lookup.md): a signing key is
  private and is not a discovery resource. Verify fetch
  (`purpose=verify`) requires the unsalted mailbox `sha256` + `key_id`.
  `purpose=signing` MUST fail. Vault `identity_id` is that same unsalted
  digest. The SComm key-id is 16 hex digits (see Changed).

### Changed

- Public responses identify a key with `scomm_key_id` only: the last 8
  octets of the fingerprint, 16 hex digits. OpenPGP uses Sequoia's Key ID.
  S/MIME uses the last 8 octets of SHA-256 of the published material.
  Responses do not include `key_id`. The verify query parameter `key_id`
  carries that same 16-hex value. Publishing a different public key with
  the same id is rejected.
- HTTP service API is now specified; mailbox→origin **resolution** remains unspecified.
- Core Discovery Document schema series remains `1.0` (`capabilities` + `extensions`).
- Versioning distinguishes protocol, HTTP `/v1/`, document schema, and per-type schemas.
- Public Discovery Documents MUST NOT project signing keys or
  `capabilities.crypto.verification`. `purpose=signing` is rejected.
  `purpose=verify` stays key-id gated on the unsalted mailbox hash.

### Added (earlier)

- Initial Discovery Protocol draft.
- Versioned JSON Schema structure.
- Initial crypto, preferences, forms, and extension capabilities.
- Example discovery documents.
- Schema-validation CI.
