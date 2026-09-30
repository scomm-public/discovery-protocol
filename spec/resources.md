# Resources

**Protocol version:** `0.2-draft`

Resources describe **state** associated with a mailbox on a discovery service.
They are the management model. The public Discovery Document remains the
primary public representation (`capabilities` + `extensions`).

```text
Typed resources (persistence / management API)
        ↓
Discovery Document projection
        ↓
capabilities + extensions
```

## 1. Resource envelope

Wire resources use an envelope (see
[`api/resource.schema.json`](../schema/v1/api/resource.schema.json)):

```json
{
  "id": "resource-id",
  "type": "https://discovery.scomm.ai/types/crypto/encryption-key/v1",
  "schemaVersion": "1.0",
  "visibility": "public",
  "value": {},
  "metadata": {
    "createdAt": "2026-09-21T12:00:00.000Z",
    "updatedAt": "2026-09-21T12:00:00.000Z"
  }
}
```

Requirements:

- `type` MUST be a globally unambiguous URI.
- `id` identifies an instance; it MUST NOT be confused with `type`.
- `value` MUST be schema-valid for that type when the server supports the type.
- Resource schema versions evolve independently of HTTP `/v1/` and of core
  document `schemaVersion`.
- Unknown **optional** resource types SHOULD be ignorable by clients that do
  not understand them.
- Third parties MAY define resource types without SComm approval (URI
  namespace ownership applies as for extensions).

## 2. Visibility

| Visibility | Meaning |
| --- | --- |
| `public` | Eligible for projection into `GET /v1/mailboxes/{mailboxSha256}` |
| `gated` | Public material that is never listed or projected. Served one instance at a time to a caller who already knows the mailbox hash and the instance locator (for example `key_id`) |
| `private` | Authenticated management only; MUST NOT appear in the public document |

`gated` is not an access control. It stops enumeration: nobody can list a
mailbox's verify keys, but anyone holding a signed message can fetch the one
key that signed it.

Encrypted vault ciphertext and CKVF backups MUST NOT be Discovery resources.
They MUST NOT appear on `GET /v1/mailboxes/{mailboxSha256}` and MUST NOT be
given upload or sync routes on this origin. Clients keep them in CKVF files.

## 3. Public vs management representation

Public Discovery Documents SHOULD omit management-only metadata (internal
revision counters, storage locators, private flags) unless a profile explicitly
publishes them.

Authenticated list/get endpoints MAY return fuller envelopes.

## 4. Initial SComm resource types (hosted profile)

Provisional type URIs (identifiers, not necessarily dereferenceable):

| Type URI | Visibility | Projects to |
| --- | --- | --- |
| `https://discovery.scomm.ai/types/crypto/encryption-key/v1` | public | `capabilities.crypto.encryption` |
| `https://discovery.scomm.ai/types/crypto/verification-key/v1` | gated | not projected; `GET /v1/keys?purpose=verify` requires unsalted `sha256` and `key_id` |
| `https://discovery.scomm.ai/types/preferences/languages/v1` | public | `capabilities.preferences.languages` |

Encryption and verification MUST remain separate semantic roles.

## 5. Mutations

Create:

```http
POST /v1/mailboxes/{mailboxSha256}/resources
```

Partial update uses **JSON Merge Patch** (RFC 7396):

```http
PATCH /v1/mailboxes/{mailboxSha256}/resources/{resourceId}
Content-Type: application/merge-patch+json
```

Authorization MUST use a common authenticated request mechanism (see
[authorization.md](authorization.md)), not ad-hoc fields inside each resource
`value`.

## 6. Type registry

A server supports a resource type by registering it. A registration is data,
not code, so a new type ships without a new endpoint or database migration.

```json
{
  "type": "https://discovery.scomm.ai/types/preferences/languages/v1",
  "schemaVersion": "1.0",
  "schema": { "$ref": "…" },
  "visibility": "public",
  "projection": "capabilities.preferences.languages",
  "operations": ["create", "update", "delete"],
  "maxBytes": 4096,
  "retention": "delete-on-remove"
}
```

| Member | Meaning |
| --- | --- |
| `type`, `schemaVersion` | The key. One registration per pair. |
| `schema` | JSON Schema (Draft 2020-12) for `value`. |
| `visibility` | `public`, `gated`, or `private` (§2). |
| `projection` | `capabilities.<path>`, `extensions.<uri>`, or `null`. Only `public` types may project. |
| `operations` | Mutations the server allows for this type. |
| `maxBytes` | Upper bound on the serialized `value`. |
| `retention` | What happens on delete or supersession, for example `delete-on-remove`, `strip-material-on-supersede`, or `retain-10y-after-retire`. |

Writes MUST fail closed:

| Condition | Error `code` |
| --- | --- |
| No registration for `type` | `unsupported_type` |
| `type` registered, `schemaVersion` not | `unsupported_version` |
| `value` fails the schema or exceeds `maxBytes` | `schema_validation_failed` |

The Discovery Document is built only from `public` registrations with a
non-null `projection`. Gated and private rows never project.

## 7. Persistence note (non-normative)

A generic wire protocol does **not** require a single JSON blob table.
Implementations SHOULD keep domain-appropriate storage (normalized key tables,
constraints, indexes) behind the resource abstraction.
