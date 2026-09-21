# Discovery Protocol

**Document status:** Early draft  
**Protocol version described here:** `0.1-draft`  
**Core schema series described here:** `1.0` (see [`schema/v1`](../schema/v1))

This document specifies the conceptual protocol: what a Discovery Document is, how clients interpret it, and what this version deliberately leaves unspecified.

It does **not** standardize mailbox lookup, DNS records, HTTP APIs, or a central registry.

## Terminology

**Mailbox**  
An email address / communication endpoint about which discovery information is published. Example: `alice@example.com`.

**Discovery Document**  
The JSON document describing published information for the mailbox.

**Core capability**  
A capability standardized by the core Discovery schema (for example `crypto`, `preferences`, `forms`).

**Extension**  
A capability defined outside the core specification using a globally unique namespace, typically a URI.

**Resolver**  
A mechanism or service capable of locating a Discovery Document for a mailbox. Resolvers are not specified in protocol `0.1-draft`.

**Discovery service**  
An implementation providing discovery functionality (publication, storage, and/or resolution).

**Reference implementation**  
An implementation maintained to demonstrate the specification without becoming the specification itself. `discovery.scomm.ai` is intended to become one such implementation. It is not the standard.

## 1. Purpose

A mailbox MAY publish an extensible, machine-readable Discovery Document describing information relevant to communicating with that mailbox.

Participants that MAY consume a Discovery Document include:

- human senders and recipients;
- email clients;
- mailbox providers;
- automated agents;
- other communication infrastructure.

The protocol surface is the document, not a set of capability-specific remote procedures. Clients SHOULD obtain a Discovery Document and interpret the capabilities they understand.

## 2. Schema-first representation

The canonical representation of a Discovery Document is JSON.

Its structure is defined using JSON Schema (Draft 2020-12). Schemas in this repository are versioned and openly licensed. Clients MUST be able to validate documents using these schemas without contacting any particular host, including `discovery.scomm.ai`.

Provisional canonical schema identifiers currently use the prefix:

```text
https://discovery.scomm.ai/schema/v1/
```

Those URLs are **identifiers**. Hosting, content negotiation, and availability of those URLs are not required for a document to be valid, and they are not a resolution protocol.

JSON Schema is the initial normative structural mechanism. Compatibility with JSON-LD and richer semantic vocabularies is a **future design direction**. JSON-LD is not required in core schema `1.0`. A later revision MAY allow an optional `@context` (or equivalent) without making it mandatory.

## 3. Protocol version vs schema version

**Protocol version** (`0.1-draft` in this document) covers runtime behavior: resolution, transport, caching, authentication, publication, signatures, error handling, and federation — most of which are not yet specified.

**Core schema version** (`schemaVersion` inside the document, currently `"1.0"`) covers the vocabulary of Discovery Documents.

**Extension versions** are chosen by extension owners and are independent of both.

See [versioning.md](versioning.md). Implementations MUST NOT treat a core schema version as implying a particular resolver design.

## 4. Mailbox as discovery subject

Discovery is conceptually associated with a mailbox. The Discovery Document identifies that mailbox in the `mailbox` field.

This draft does not bind a mailbox to a single organizational domain model, vendor account, or provider API. How a client **finds** the document for a mailbox is intentionally unspecified (see [§8](#8-future-resolution-specification)).

## 5. Discovery Document

A Discovery Document is a JSON object.

### 5.1 Required members

A document MUST include:

| Member | Meaning |
| --- | --- |
| `schemaVersion` | Core schema version of the document vocabulary. For this series, the string `"1.0"`. |
| `mailbox` | The mailbox the document describes. |

The following is conceptually valid:

```json
{
  "schemaVersion": "1.0",
  "mailbox": "alice@example.com"
}
```

A mailbox MUST be allowed to publish a minimal Discovery Document. Encryption keys, forms, preferences, and extensions are optional.

### 5.2 Optional members

| Member | Meaning |
| --- | --- |
| `$schema` | Optional identifier of a JSON Schema. If present, it SHOULD refer to the intended core schema. Values under `https://discovery.scomm.ai/schema/` are provisional identifiers. |
| `capabilities` | Object of core (and future core) capabilities. |
| `extensions` | Object of namespaced third-party capabilities. Keys SHOULD be absolute URIs. |

Unknown optional members at the document root SHOULD be ignored by clients that do not understand them, unless a later major schema version defines otherwise.

### 5.3 Capabilities

`capabilities` is an object. Defined members in core schema `1.0` include:

| Capability | Schema | Role |
| --- | --- | --- |
| `crypto` | [crypto.schema.json](../schema/v1/crypto.schema.json) | Encryption and signature-verification material and related cryptographic hints |
| `preferences` | [preferences.schema.json](../schema/v1/preferences.schema.json) | Communication preferences such as languages |
| `forms` | [forms.schema.json](../schema/v1/forms.schema.json) | Structured forms associated with contacting the mailbox |

Absence of a capability means that capability is not published. It does **not** necessarily mean the mailbox lacks the real-world ability (for example, a mailbox may support OpenPGP without publishing keys here).

Clients MUST treat encryption and verification as distinct semantic roles when both are present. An encryption key MUST NOT be assumed to be a verification key, and a verification key MUST NOT be assumed to be an encryption key, unless a future well-defined crypto family profile says otherwise.

Possible future core or extension families include identity, semantics, privacy, compliance, retention, attachments, security requirements, automation, endpoints, and policies. This list is illustrative.

### 5.4 Extensions

See [extensions.md](extensions.md).

```json
{
  "extensions": {
    "https://example.org/discovery/appointment/v1": {
      "bookingRequired": true
    }
  }
}
```

## 6. Validation

Implementations that validate documents SHOULD use the JSON Schemas in this repository (or byte-for-byte equivalent copies).

Validation of **structure** is separate from validation of **authenticity**. A schema-valid document MAY still be forged, stale, or bound to the wrong mailbox until a later protocol version specifies publication authentication.

### 6.1 Unknown capability handling

Clients:

- MUST NOT reject an otherwise valid document solely because it contains an optional core capability the client does not implement;
- MUST NOT reject an otherwise valid document solely because it contains an unknown optional extension (see [extensions.md](extensions.md));
- SHOULD ignore unknown optional fields inside capabilities they partially understand, unless those fields are required by a profile the client claims to implement;
- MUST NOT invoke security-sensitive behavior (for example, encrypting to a key) based on a capability they do not understand.

Producers SHOULD use extensions for experimental or vendor-specific data rather than overloading undefined core field names when a URI namespace would be clearer.

## 7. Hosted services are not the standard

```text
Discovery Protocol
        |
        v
Open specification + schemas  (this repository)
        |
        v
Compatible implementations
        |
        +-- discovery.scomm.ai
        +-- another vendor's discovery service
        +-- self-hosted implementation
```

`discovery.scomm.ai` MAY later provide a reference or hosted implementation. Clients MAY use any compatible discovery service or local document source. This specification MUST remain useful without SComm software.

## 8. Future Resolution Specification

Protocol `0.1-draft` intentionally does **not** fully standardize lookup or resolution.

A future document (likely a protocol minor or major revision, not a silent core-schema change) should specify how a client maps:

```text
mailbox  -->  Discovery Document
```

Candidate approaches, **none of which is selected here**, include:

- a centralized resolver;
- DNS records (for example, URI or HTTPS records, or other DNS-based hints);
- HTTPS well-known resources on a domain;
- provider delegation (the mailbox provider points at a discovery service);
- signed registry records;
- combinations of the above.

Until that work exists:

- this repository MUST NOT be read as requiring a global SComm-operated registry;
- implementations MAY experiment with local files, test fixtures, or private resolvers;
- interoperability of resolution across vendors SHOULD NOT be assumed.

Related open questions include publication APIs, cache lifetimes, error codes, and federation between discovery services.

## 9. Forms (non-transport)

A `forms` capability MAY declare JSON Schema-backed forms. A capable client MAY:

1. retrieve the form definition;
2. render it natively or in a web view;
3. auto-fill known information;
4. validate instance data against the form's JSON Schema;
5. compose the result into an email or semantic payload.

A client that cannot render the form MAY open an optional `web` URL if present.

This draft does **not** specify how form instance data is transported in email. That is future work.

## 10. Security and privacy

Discovery information may directly influence security-sensitive behavior. See [security-considerations.md](security-considerations.md).

Merely querying a mailbox can leak communication intent. See [privacy.md](privacy.md).

## 11. Open questions

The following are intentionally unresolved in this draft:

- authenticating Discovery Documents (signatures, transparency logs, provider attestations, etc.);
- binding a document to a mailbox across resolution mechanisms;
- key expiry, revocation, and preference among multiple keys;
- profiles for OpenPGP, S/MIME, and post-quantum families;
- JSON-LD / semantic message type vocabularies;
- compliance, privacy, and retention core vocabularies;
- payload size limits and fetch timeouts (implementations SHOULD still apply local limits; see security considerations).
