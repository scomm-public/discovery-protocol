# Mailbox grants

**Protocol version:** `0.2-draft`

The directory origin proves mailbox control and signs a short-lived grant.
Vault is a different origin (`https://vault.scomm.ai`, debug
`http://127.0.0.1:3001`) and does not send mail.

Two challenge types produce a grant: email OTP and OIDC ID token
([challenges.md](challenges.md)). Both produce the same grant format.

## 1. Request and verify (email OTP)

Create `POST /v1/mailboxes/{mailboxSha256}/challenges` with
`type` `https://discovery.scomm.ai/challenges/email-otp/v1`, `email`, a
purpose URI, and `msk_jkt` when the purpose arms an MSK. The address is not
stored as a directory row.

Respond `POST /v1/mailboxes/{mailboxSha256}/challenges/{id}/responses` with
`{ "response": { "code" } }`. The response does not contain an email address.

## 2. Purposes

| Purpose | Verify returns | Mail is sent when | `msk_fingerprint` |
| --- | --- | --- | --- |
| `enroll` | `otp_grant` (directory) | The address is deliverable | MSK being armed (from `msk_jkt`) |
| `replace_msk` | `otp_grant` (directory) and `vault_grant` | An armed directory MSK exists | replacement MSK (from `msk_jkt`) |
| `vault_open` | `otp_grant` (vault) | An armed directory MSK exists | armed directory MSK |
| `recovery_envelope` | `otp_grant` (vault) | An armed directory MSK exists | armed directory MSK |
| `recovery_generation` | `otp_grant` (vault) | An armed directory MSK exists | armed directory MSK |
| `vault_backup` | `otp_grant` (vault) | An armed directory MSK exists | armed directory MSK |

If a vault purpose has no armed directory MSK, the request still returns `202`
and no message is sent. The ID-token path returns `409 master_key_not_armed`
because the caller has already proven control of the mailbox.

A directory grant is an opaque single-use token held by the directory. It is
bound to `sha256`, purpose, and `msk_fingerprint`, and it never leaves the
directory's trust boundary except as a bearer string returned to the client.
A vault grant is the signed token of §3 with `aud` containing the vault
origin and `identity_id` set to the same unsalted mailbox SHA-256 that the
directory uses as `mailboxSha256`. `replace_msk` returns both so the client
can arm the new MSK in the directory and then rebind the vault to the same
key.

### 2.1 Arming in one call

There is no pending MSK state. The client redeems a directory grant in a
single request that carries the grant, the MSK, and a proof signed by that MSK:

| Route | Grant purpose | Proof operation |
| --- | --- | --- |
| `POST /v1/msk/arm` | `enroll` | `arm_msk` |
| `POST /v1/msk/replace/arm` | `replace_msk` | `arm_replacement_msk` |

Body: `{ "identity_id", "otp_grant", "msk": { "algorithm", "public_key" }, "msk_proof" }`.
The server verifies the proof before spending the grant, then requires
SHA-256 of `msk.public_key` to equal the grant's `msk_fingerprint`. Arming is
atomic: `/v1/msk/arm` fails with `409` if an MSK is already armed;
`/v1/msk/replace/arm` fails with `404` if none is armed and `409
master_key_unchanged` if the key is the same. Older two-step routes that stored
a candidate first (`POST /v1/msk/enroll`, `POST /v1/msk/replace`) answer
`410 single_call_arm_required`.

## 3. Grant format

The signed text is ASCII. The first line is the header. Each following line is
`field=value` in exactly this order, each line ending in LF (`0x0A`),
including the last. Values MUST NOT contain LF. Empty values are written as
`field=`.

```text
Scomm/grant/v1
iss=https://discovery.scomm.ai
aud=<space-separated audience origins>
kid=<signing key id>
purpose=<purpose>
identity_id=<64 lowercase hex>
msk_fingerprint=<64 lowercase hex SHA-256 of the raw MSK public key for its algorithm, or empty>
amr=<otp | id_token>
idp=<google | microsoft | empty>
exp=<unix ms>
jti=<base64url of 16 random bytes>
```

The token is:

```text
base64url(text) "." base64url(Ed25519(text))
```

Base64url has no padding. The signature is over the text bytes, not over the
base64url string.

| Field | Rule |
| --- | --- |
| `iss` | The directory origin. Verifiers compare it exactly. |
| `aud` | One or more origins. A verifier accepts the grant only if its own origin is listed. |
| `kid` | Selects the verification key from the published key set. Unknown `kid` fails. |
| `identity_id` | Unsalted `SHA-256(UTF-8(canonical mailbox))` (same value as `mailboxSha256`). |
| `msk_fingerprint` | See §2. Consumers that arm or bind an MSK MUST compare it to the presented key. |
| `amr` / `idp` | How mailbox control was proven. Verifiers MAY refuse `id_token`. |
| `exp` | At most 15 minutes after issue. The mailer issues 5 minutes. |
| `jti` | Single-use per verifier. Spend it atomically with an expiry of at least `exp`. |

The grant MUST NOT contain the mailbox address. For vault purposes the
`identity_id` field IS the mailbox hash; directory-purpose verify responses
MAY still return that hash as `sha256` instead of `identity_id`.

## 4. Key set

The directory publishes its grant verification keys as a key set of
`kid → Ed25519 public key`. Verifiers are configured with this set. Rotation
adds a new `kid`, signs with it, and removes the old `kid` after every grant
signed with it has expired. Production verifiers MUST NOT accept a key
committed to a public repository.

## 5. Identity

`identity_id` is the unsalted mailbox SHA-256 for every purpose that carries
it, including vault purposes. There is no identity OPRF and no separate vault
identity derivation. The mailer computes
`SHA-256(UTF-8(canonical mailbox))` locally when it holds the address
(OTP request or ID-token verify) and writes that digest into the grant.

On the wire the field is always `identity_id` (snake case) in grant text,
request bodies, and responses. SDKs MAY expose it as `identityId`. It is
never called `vault_id`: a vault id is a separate random value the client
mints for one container.

## 6. Test vectors

[`examples/v1/api/grant-vectors.json`](../examples/v1/api/grant-vectors.json)
holds valid and invalid tokens signed by a public test key.
[`tests/grant.mjs`](../tests/grant.mjs) is a reference verifier that `npm test`
runs against them.
