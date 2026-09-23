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
| `public` | Eligible for projection into `GET /v1/identities/{identity_id}` |
| `private` | Authenticated management only; MUST NOT appear in the public document |

Encrypted vault ciphertext, recovery envelopes, password-wrapped vault
backups (`scomm-vault-export` hosted on the write host), and similar
confidential material MUST use `private` (or dedicated non-Discovery APIs).
They MUST NOT be published as public Discovery capabilities and MUST NOT
appear on `GET /v1/identities/{identity_id}`.

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
| `https://discovery.scomm.ai/types/crypto/verification-key/v1` | public | `capabilities.crypto.verification` |
| `https://discovery.scomm.ai/types/preferences/languages/v1` | public | `capabilities.preferences.languages` |

Encryption and verification MUST remain separate semantic roles.

## 5. Mutations

Create:

```http
POST /v1/identities/{identity_id}/resources
```

Partial update uses **JSON Merge Patch** (RFC 7396):

```http
PATCH /v1/identities/{identity_id}/resources/{resourceId}
Content-Type: application/merge-patch+json
```

Authorization MUST use a common authenticated request mechanism (see
[authorization.md](authorization.md)), not ad-hoc fields inside each resource
`value`.

## 6. Persistence note (non-normative)

A generic wire protocol does **not** require a single JSON blob table.
Implementations SHOULD keep domain-appropriate storage (normalized key tables,
constraints, indexes) behind the resource abstraction.
