# Extensions

The core schema MUST NOT assume that this repository knows every capability that will ever exist.

Third parties MAY introduce capabilities without modifying the core specification and without SComm approval. That is intentional: Discovery Protocol is vendor-neutral.

## Identifier

An extension SHOULD be identified by a globally unique URI. Absolute HTTPS URIs are preferred because they are easy to compare and can later point at documentation or an extension-specific JSON Schema.

```json
{
  "extensions": {
    "https://example.org/discovery/calendar/v1": {
      "bookingRequired": true
    }
  }
}
```

The URI identifies the extension **type** (vocabulary), not a particular mailbox. Breaking changes SHOULD use a new URI (for example `.../v2`) rather than redefining an existing namespace.

SComm-operated URIs are not required. `example.org` in examples is not a registry.

## Document location

Extensions live in the top-level `extensions` object. They MUST NOT be placed under `capabilities` unless they are later standardized as core capabilities.

`capabilities` is the core vocabulary. `extensions` is the open-world vocabulary.

## Client requirements

Unknown optional extensions MUST NOT cause an otherwise valid Discovery Document to be rejected solely because the client does not understand them.

In RFC 2119 terms:

- **MUST / MUST NOT** — required for interoperability or safety.
- **SHOULD / SHOULD NOT** — strongly recommended unless there is a good reason.
- **MAY** — truly optional.

Consequences:

- A validator implementing the core schema MUST accept `extensions` objects whose keys are URIs and whose values are JSON objects, even when the validator has no schema for those objects.
- A client MAY ignore an extension it does not implement.
- A client MUST NOT act on untrusted extension data in a security-sensitive way (for example, fetching and executing a URL from an unknown extension) without an independent trust decision. See [security-considerations.md](security-considerations.md).

## Values

In core schema `1.0`, each extension value MUST be a JSON object. This keeps the map uniform and allows future nested members. Primitive values at the extension root are rejected by the core schema so that later object-shaped profiles remain possible.

The **contents** of that object are not constrained by the core schema. Additional properties are allowed.

## Extension-specific JSON Schemas

A future convention MAY associate an extension URI with a JSON Schema, for example:

- published at the extension URI or a documented well-known sibling URL;
- referenced from extension metadata not yet defined in core.

This draft does not require extension authors to publish a schema, and core validators MUST NOT fetch remote extension schemas as part of default Discovery Document validation (that would couple validation to network trust). Implementations MAY offer opt-in validation against a locally configured extension schema.

## Promoting an extension to core

If an extension becomes broadly useful, it MAY be proposed as a core capability (a `capabilities` member) in a minor or major core schema revision. Promotion is a specification choice, not an admission-control process owned by a single vendor.

Until promotion, producers SHOULD keep the data under `extensions` with a stable URI.

## What not to do

- Do not encode experimental vendor APIs as required core fields.
- Do not use relative or ambiguous extension keys (`calendar`, `ext1`) when a URI is available.
- Do not assume a central extension registry in this version.
- Do not treat unrecognized extensions as a document error.
