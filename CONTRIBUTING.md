# Contributing

Thank you for contributing to the Discovery Protocol.

This repository is a **vendor-neutral specification and schema** project. Changes here can affect independent implementations of:

- the protocol (resolution, transport, caching, authenticity — mostly future work);
- the core Discovery Document vocabulary;
- extension conventions;
- examples and validation fixtures;
- the security and privacy model.

Please keep proposals conservative. The current documents are an early draft. Prefer additive, backward-compatible changes over breaking redesigns.

## Before you start

1. Read [README.md](README.md) and [spec/README.md](spec/README.md).
2. Read [spec/versioning.md](spec/versioning.md) so protocol, core schema, and extension versions are not conflated.
3. Read [spec/extensions.md](spec/extensions.md) before proposing a new capability.

## Core capability vs extension

If you propose a new **core** capability (a property under `capabilities` in the core schema), explain why it belongs in core rather than an independently namespaced extension.

A capability is a stronger candidate for core when:

- it is broadly useful across mailboxes, clients, and vendors;
- a common vocabulary prevents harmful fragmentation;
- independent extensions would likely be incompatible in ways that harm interoperability.

A capability is a stronger candidate for an **extension** when:

- it is domain-specific, vendor-specific, or experimental;
- only a subset of implementations need it;
- it can evolve on its own schedule.

SComm approval is **not** required to define an extension. Extensions are identified by globally unique URIs. See [spec/extensions.md](spec/extensions.md).

## Schema evolution

- Minor core schema revisions should normally be additive.
- Existing clients must be able to ignore optional capabilities they do not understand.
- Breaking semantic changes require a new major core schema version.
- Do not make previously optional fields required in a minor revision.
- Do not change the meaning of existing fields in a minor revision.

## Required coverage

Pull requests that change schemas or document structure MUST include:

- an updated or new example under `examples/` that demonstrates the feature;
- validation coverage so CI continues to accept valid documents and reject the intended invalid cases;
- specification text when behavior is not obvious from the schema `description` fields alone.

New core capabilities SHOULD include at least one valid example and, when practical, an invalid fixture that documents a rejected shape.

## Validation

From the repository root:

```bash
npm ci
npm test
```

CI runs the same checks. Do not merge schema changes that fail example validation.

## Pull requests

- Keep the change set focused.
- Update [CHANGELOG.md](CHANGELOG.md) under **Unreleased**.
- Do not claim that the protocol is stable, standardized, or an IETF RFC.
- Do not treat `discovery.scomm.ai` as the specification. It is intended to become one compatible implementation.
- Do not introduce client SDKs, hosted-service code, or a chosen resolution mechanism unless that is the explicit subject of the change.

## Normative language

When a document uses RFC 2119 / RFC 8174 keywords (`MUST`, `MUST NOT`, `SHOULD`, `MAY`), they are used as defined in those RFCs. Prefer plain language unless a requirement needs to be testable across implementations.

## Code of collaboration

Discuss design trade-offs in issues or pull requests. This is an open protocol: another organization should be able to implement it without depending on SComm software.
