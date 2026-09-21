# Versioning

Discovery Protocol keeps three version series separate. Mixing them causes clients to couple document vocabulary to transport, or to freeze third-party extensions whenever the core schema changes.

```text
Protocol version     →  how documents are found, fetched, cached, and authenticated
Core schema version  →  what a Discovery Document may contain (core vocabulary)
Extension version    →  the vocabulary of one namespaced extension
```

This repository currently publishes:

| Series | Initial identifier | Stability |
| --- | --- | --- |
| Protocol | `0.1-draft` | Experimental; resolution is unspecified |
| Core schema | `1.0` (schema directory `schema/v1`) | Experimental vocabulary; not a declared stable release |
| Extensions | Per extension URI | Owned outside the core |

No `v1.0.0` stable release of the protocol or schema has been made. Version numbers below describe **policy**, not a promise that `1.0` is frozen.

## Protocol version

The **protocol version** covers evolution of:

- resolution (mailbox → document);
- HTTP or other transport behavior;
- caching and freshness;
- authentication and publication;
- signatures and other authenticity mechanisms;
- error handling;
- federation between discovery services.

Protocol `0.1-draft` documents the data model and explicitly postpones those runtime topics. A future protocol revision MAY add resolution rules without changing `schemaVersion` if the document vocabulary is unchanged. Conversely, the core schema MAY gain optional fields while resolution remains unspecified.

Clients MUST NOT infer resolver behavior from `schemaVersion` alone.

This draft does not define a negotiation mechanism (for example, protocol version headers). Avoid building one until there is a concrete transport to attach it to.

## Core schema version

The **core schema version** is the `schemaVersion` field in a Discovery Document.

For documents written against this repository's `schema/v1` files, `schemaVersion` is `"1.0"`.

Schema evolution concerns the vocabulary represented **inside** Discovery Documents: core capabilities, field names, and their meanings.

JSON Schema files live under `schema/vN/` for major series `N`. Identifiers such as `https://discovery.scomm.ai/schema/v1/discovery.schema.json` are provisional canonical identifiers for that series.

### Minor versions

Minor revisions (`1.0` → `1.1` → `1.2`) SHOULD be additive and backward compatible for tolerant clients.

Illustrative (not a release plan):

```text
1.0   encryption, verification, preferred language
1.1   forms, communication preferences
1.2   privacy, retention
1.3   compliance, semantic communication
```

This initial draft already includes early `crypto`, `preferences`, and `forms` shapes so the extensibility model can be tested. Later minor versions MAY add optional capabilities or optional fields.

A client that implements `1.0` SHOULD ignore optional members introduced in `1.1` if it does not understand them.

Minor versions MUST NOT:

- remove required or optional core fields that existing producers rely on without a major version change;
- change the meaning of an existing field;
- make a previously optional field required.

### Major versions

Major versions (`1.x` → `2.0`) MAY contain breaking changes: renamed fields, changed types, or new required members.

Clients MUST NOT silently assume that a document with a different major `schemaVersion` is compatible with their implemented major version.

This draft does not specify how a client discovers an alternate document when majors differ. Until that exists, a client SHOULD refuse to apply security-sensitive capabilities from a major version it does not implement.

## Extension version

Each extension is identified by a globally unique URI. Owners SHOULD put a version component in that URI (for example `.../calendar/v1`) so breaking extension changes can use a new URI.

Extension versioning is controlled by the extension owner. Core schema minor/major bumps do not require extensions to change, and extension bumps do not require a core schema release.

See [extensions.md](extensions.md).

## Relationship to package releases

Git tags and changelog entries for this repository MAY lag or lead the `schemaVersion` string. Experimental drafts can iterate under **Unreleased** without declaring a stable protocol or schema release.

## Open questions

- Whether protocol version should ever appear **inside** the Discovery Document (currently it does not, to avoid conflation with `schemaVersion`).
- How clients advertise which protocol and schema majors they implement, once a transport exists.
- Compatibility windows for hosted schema URLs versus copies embedded in SDKs.
