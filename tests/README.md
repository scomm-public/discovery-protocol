# Tests

This repository does not ship a large application test framework. CI proves:

1. Schema files are valid JSON and valid JSON Schema (Draft 2020-12).
2. Every example under `examples/` is accepted by the core Discovery schema.
3. Fixtures under `tests/invalid/` are rejected.

## Run locally

```bash
npm ci
npm test
```

Requires Node.js 20 or later.

## Valid examples

| File | Intent |
| --- | --- |
| [examples/v1/minimal.json](../examples/v1/minimal.json) | Mailbox with no published capabilities |
| [examples/v1/crypto.json](../examples/v1/crypto.json) | Encryption and verification as separate roles |
| [examples/v1/preferences.json](../examples/v1/preferences.json) | Preferred languages only |
| [examples/v1/form.json](../examples/v1/form.json) | Structured form declaration |
| [examples/v1/extensions.json](../examples/v1/extensions.json) | URI-namespaced third-party extension |

## Invalid fixtures

| File | Intent |
| --- | --- |
| [invalid/malformed-mailbox.json](invalid/malformed-mailbox.json) | `identityId` is not 64 lowercase hex characters |
| [invalid/schema-version-type.json](invalid/schema-version-type.json) | `schemaVersion` is not a string |
| [invalid/extensions-not-object.json](invalid/extensions-not-object.json) | `extensions` is an array rather than a URI-keyed object |

These fixtures are not Discovery Documents; they exist only to lock the schema's rejection behavior.

## What is not tested yet

Authenticity, resolution, transport, and live fetching of form schemas are unspecified in protocol `0.1-draft` and have no tests here.
