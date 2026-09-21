# Discovery Protocol

**Status: Early Draft / Experimental**

Discovery Protocol is an open, extensible protocol for publishing machine-readable information associated with an email mailbox. It enables senders, recipients, clients, and automated systems to discover capabilities, preferences, cryptographic material, forms, policies, and future semantic metadata before or during communication.

Encryption keys and signature-verification keys are Discovery capabilities, not special-purpose protocol endpoints.

This repository is the specification and schema source. It is not a client, SDK, or hosted discovery service.

## Overview

Discovery Protocol allows a mailbox to publish machine-readable information relevant to communicating with that mailbox.

The fundamental abstraction is a **Discovery Document**: an extensible JSON document describing information that a sender, receiver, email client, automated agent, or other communication participant may use when interacting with that mailbox.

Public encryption keys and signature-verification keys are only two possible discovery capabilities. A client obtains a general Discovery Document and interprets the capabilities it understands. Clients MUST NOT be designed around capability-specific APIs such as `getEncryptionKey()` or `getVerificationKey()` as the primary protocol surface.

## Motivation

Traditional email begins communication with little structured knowledge about the recipient's capabilities, requirements, preferences, policies, or expectations. A sender often cannot answer basic questions without out-of-band knowledge:

- Does this mailbox support OpenPGP?
- Which public key should be used for encryption?
- Which key can verify signatures from this mailbox?
- Does the mailbox prefer communication in a particular language?
- Does it require a structured form before or as part of a message?
- What privacy information applies?
- Are certain semantic message types supported?
- Are there compliance or retention requirements?

Discovery creates a standardized pre-communication metadata layer. It is mailbox-centric: the subject of discovery is an address such as `alice@example.com`, not a particular vendor's account model.

## Core idea

```text
Mailbox
   |
   v
Discovery Document
   |
   +-- Crypto
   +-- Preferences
   +-- Forms
   +-- Privacy
   +-- Compliance
   +-- Semantics
   +-- Extensions
```

A mailbox may publish as little or as much as it chooses. A minimal document that identifies the mailbox and schema version is valid. Crypto, forms, and other capabilities are optional.

Illustrative future capability families (not all are defined in this draft):

```text
crypto
identity
preferences
forms
semantics
privacy
compliance
retention
attachments
security
automation
endpoints
policies
extensions
```

This list is not exhaustive. The protocol is designed so that new families can appear without rewriting the core.

## Example

The following document is illustrative. Schema identifiers that use `https://discovery.scomm.ai/...` are **provisional canonical identifiers**. Production hosting and mailbox-resolution semantics are **not** finalized.

```json
{
  "$schema": "https://discovery.scomm.ai/schema/v1/discovery.schema.json",
  "schemaVersion": "1.0",
  "mailbox": "alice@example.com",
  "capabilities": {
    "crypto": {
      "encryption": {
        "keys": []
      },
      "verification": {
        "keys": []
      }
    },
    "preferences": {
      "languages": ["en"]
    }
  },
  "extensions": {}
}
```

A mailbox with no published capabilities is also valid:

```json
{
  "schemaVersion": "1.0",
  "mailbox": "alice@example.com"
}
```

See [examples/v1](examples/v1) for additional documents.

## Architecture

- **JSON document.** The canonical representation of a Discovery Document is JSON.
- **JSON Schema validation.** Structure is defined with versioned JSON Schema. Clients can validate documents independently of any hosted service.
- **Versioned core vocabulary.** Fields under `capabilities` that this repository standardizes form the core schema. See [schema/v1](schema/v1).
- **Separately versionable extensions.** Third-party capabilities use globally unique URIs and do not require a core schema change. See [spec/extensions.md](spec/extensions.md).
- **Tolerant clients.** Clients use the capabilities they understand and ignore unknown optional capabilities and extensions.
- **Vendor-neutral implementations.** Any mailbox provider, client, discovery server, or SDK may implement this specification.
- **Future SDKs.** Language bindings may appear later; they are not part of this repository yet.

```text
Discovery Protocol
        |
        v
Open specification + schemas
        |
        v
Compatible implementations
        |
        +-- discovery.scomm.ai
        +-- another vendor's discovery service
        +-- self-hosted implementation
```

The repository defines the standard. `discovery.scomm.ai` is intended to become one reference or hosted implementation of it. It is not the protocol.

## Status

**Early Draft / Experimental.**

This is not an Internet Standard, not an IETF RFC, and not a stable v1.0 protocol release. Document structure and identifiers will change. Implementers should treat interoperability as experimental and should not assume production authenticity or resolution behavior.

## Repository layout

| Path | Purpose |
| --- | --- |
| [spec/](spec/) | Protocol, versioning, extensions, security, and privacy text |
| [schema/v1/](schema/v1/) | Core JSON Schemas for Discovery Documents |
| [examples/v1/](examples/v1/) | Valid example documents |
| [tests/](tests/) | Validation runner and invalid fixtures |
| [.github/workflows/](.github/workflows/) | CI that checks JSON and schema validity |

## Versioning

Three version series (plus HTTP API major) are independent:

1. **Protocol version** (`0.2-draft`) — HTTP service API, auth profiles; mailbox→origin resolution still unspecified.
2. **HTTP API major** — `/v1/` path prefix (independent of document `schemaVersion`).
3. **Core schema version** — the vocabulary inside a Discovery Document (`schemaVersion` `"1.0"`).
4. **Extension / resource / operation versions** — owned by each type's namespace.

Minor schema revisions are additive by default. Breaking semantic changes require a new major version. Details: [spec/versioning.md](spec/versioning.md).

HTTP paths: [spec/http-api.md](spec/http-api.md).

## Extensions

Third parties can introduce capabilities without modifying the core specification. Extensions SHOULD be identified by a globally unique URI:

```json
{
  "extensions": {
    "https://example.org/discovery/appointment/v1": {
      "bookingRequired": true
    }
  }
}
```

Unknown optional extensions MUST NOT cause an otherwise valid Discovery Document to be rejected solely because the client does not understand them. Details: [spec/extensions.md](spec/extensions.md).

## Implementations

Independent implementations are expected: mailbox providers, email clients, discovery servers, and libraries.

`discovery.scomm.ai` is intended to become a compatible implementation and, later, possibly a reference service. Behavior of that host is **not** normative for this specification.

A useful test of the design: the protocol should remain implementable if SComm does not exist.

## SDKs

SDKs may later exist for languages such as:

- Rust
- Dart
- JavaScript / TypeScript
- WebAssembly

This commit does not include SDKs. Schema documents in this repository are the source of truth for document structure.

## Terminology

| Term | Meaning |
| --- | --- |
| **Mailbox** | An email address / communication endpoint about which discovery information is published. |
| **Discovery Document** | The JSON document describing published information for the mailbox. |
| **Core capability** | A capability standardized by the core Discovery schema. |
| **Extension** | A capability defined outside the core specification using a globally unique namespace. |
| **Resolver** | A mechanism or service capable of locating a Discovery Document for a mailbox. |
| **Discovery service** | An implementation providing discovery functionality. |
| **Reference implementation** | An implementation maintained to demonstrate the specification without becoming the specification itself. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Proposed core capabilities should explain why they do not belong in an independently namespaced extension.

## License

This project is licensed under the [Apache License 2.0](LICENSE). That license is intended to allow independent, commercial, and self-hosted implementations, SDKs, redistribution, and derivative work, subject to the license terms.

Copyright 2026 SComm
