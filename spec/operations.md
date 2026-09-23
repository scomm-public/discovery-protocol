# Operations

**Protocol version:** `0.2-draft`

Operations represent **actions or state transitions** that do not map cleanly
onto simple resource CRUD (for example MSK replacement).

## 1. Endpoint

```http
POST /v1/mailboxes/{mailboxSha256}/operations
```

## 2. Operation envelope

See [`api/operation.schema.json`](../schema/v1/api/operation.schema.json):

```json
{
  "type": "https://discovery.scomm.ai/operations/msk/replace/v1",
  "schemaVersion": "1.0",
  "input": {
    "newPublicKey": "…",
    "newKeyId": "…"
  }
}
```

When using the SComm MSK authorization profile, the HTTP body MAY be the
existing signed mutation envelope whose `operation` field names the short
operation token, with `payload` carrying `input`. See [authorization.md](authorization.md).

## 3. Operation definitions

Each operation type SHOULD document:

- canonical type URI;
- version;
- input schema;
- output/result schema;
- allowed authorization profile(s);
- idempotency semantics;
- security considerations.

Schemas live under [`schema/v1/operations/`](../schema/v1/operations/). JSON
Schema defines **structure** only. Protocol text and the server enforce
**semantics**.

## 4. Initial operations (SComm hosted profile)

Only operations needed for current hosted behavior:

| Type URI | Short token | Auth |
| --- | --- | --- |
| `https://discovery.scomm.ai/operations/msk/enroll/v1` | `enroll_msk` / `arm_msk` | challenge + MSK PoP |
| `https://discovery.scomm.ai/operations/msk/replace/v1` | `replace_msk` / `arm_replacement_msk` | challenge + MSK PoP |
| `set_keys`, `set_signing_key`, `set_encryption_key`, `retire_key`, `update_preferences` | same | MSK |

Do not add speculative operations that have no current server behavior.

## 5. Idempotency

Clients SHOULD send `Idempotency-Key` and/or rely on signed `nonce` replay
protection so network retries cannot rotate an MSK twice or duplicate
security-sensitive transitions.
