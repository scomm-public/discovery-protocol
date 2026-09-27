# Challenges

**Protocol version:** `0.2-draft`

Challenges prove a precondition for a later operation (for example mailbox
control) without making the challenge mechanism a permanent top-level protocol
primitive for every capability.

Email OTP and OIDC ID token are the two defined challenge types. Future types
MAY include recovery codes, WebAuthn, existing-device approval, or
out-of-band approval. Every type ends in the same grant
([otp-grants.md](otp-grants.md)).

## 1. Lifecycle

Create:

```http
POST /v1/mailboxes/{mailboxSha256}/challenges
```

```json
{
  "type": "https://discovery.scomm.ai/challenges/email-otp/v1",
  "purpose": "https://discovery.scomm.ai/operations/msk/replace/v1"
}
```

Response (secrets MUST NOT be included):

```json
{
  "id": "chal_…",
  "type": "https://discovery.scomm.ai/challenges/email-otp/v1",
  "status": "pending",
  "purpose": "https://discovery.scomm.ai/operations/msk/replace/v1",
  "expiresAt": "2026-09-21T12:10:00.000Z",
  "attemptsRemaining": 5
}
```

Respond:

```http
POST /v1/mailboxes/{mailboxSha256}/challenges/{challengeId}/responses
```

```json
{
  "response": {
    "code": "Ab3XyZ9kQm2"
  }
}
```

Mailbox OTP codes are **11-character Base62** (`0-9A-Za-z`) in the SComm hosted
profile. They are not 6-digit authenticator TOTP codes.

Status:

```http
GET /v1/mailboxes/{mailboxSha256}/challenges/{challengeId}
```

## 2. Binding requirements

Challenge artifacts and any post-success grant MUST be:

- purpose-bound;
- mailbox-bound (or principal-bound in the hosted profile);
- short-lived;
- preferably single-use where appropriate;
- resistant to replay.

Successful verification SHOULD bind a short-lived, purpose-scoped server-side
authorization for the subsequent operation rather than minting long-lived bearer
credentials.

A satisfied challenge for MSK replace MUST NOT authorize unrelated operations
(for example vault upload).

## 3. Email OTP challenge type

Schema: [`challenges/email-otp.schema.json`](../schema/v1/challenges/email-otp.schema.json).

Type URI: `https://discovery.scomm.ai/challenges/email-otp/v1`

Servers MUST rate-limit creation, expire codes, and bound verify attempts.
Raw OTP values MUST NOT be stored in plaintext; store only a salted hash (or
equivalent). Attempt counters MUST be updated atomically and the code MUST be
spent atomically on success.

### 3.1 MSK binding

A challenge whose purpose arms a Mailbox Signing Key (`enroll`,
`replace_msk`) MUST carry `msk_jkt`: base64url (no padding) of the SHA-256 of
the raw 32-byte Ed25519 MSK public key. The server stores it with the OTP
record. The grant carries it as `msk_fingerprint` (the same digest in
lowercase hex). The arming operation MUST reject a key whose fingerprint does
not match. Without this binding, an attacker who sees the OTP could arm a key
of their choosing.

For vault purposes the client does not send `msk_jkt`. The server copies the
fingerprint of the armed directory MSK into the grant.

## 4. OIDC ID token challenge type

Schema: [`challenges/oidc-id-token.schema.json`](../schema/v1/challenges/oidc-id-token.schema.json).

Type URI: `https://discovery.scomm.ai/challenges/oidc-id-token/v1`

Create returns the challenge plus a `nonce`. The client runs a normal OIDC
sign-in with that nonce and responds with `{ "response": { "id_token" } }`.
The mailbox address is not sent in the create request; it is derived from the
token and hashed. If the result does not equal `{mailboxSha256}` the response
is `403 mailbox_mismatch`.

The server MUST:

- verify the signature against the provider's JWKS, selected by `kid`;
- check `exp`, `nbf`, `iat` (maximum age configured, small clock skew), and
  that `nonce` equals the challenge nonce;
- accept only configured client ids in `aud` (and `azp` equal to `aud` when
  present), optionally restricted per purpose;
- spend the challenge and the token (`jti`, `uti`, or a hash of the token)
  atomically so neither can be replayed;
- apply the `msk_jkt` rule of §3.1.

Trusted mailbox address:

| Provider | `iss` | Address is trusted when |
| --- | --- | --- |
| Google | `https://accounts.google.com` or `accounts.google.com` | `email_verified` is `true`; use `email` |
| Microsoft consumer (`tid` 9188040d-6c67-4c5b-b112-36a304b66dad) | `https://login.microsoftonline.com/{tid}/v2.0` | `email`, else `preferred_username` |
| Microsoft work or school | same | `xms_edov` is `true` and `email` is present, or the address is in `verified_primary_email` / `verified_secondary_email` |

Any other case is `403 email_unverified`. A server MAY resolve an unverified
Microsoft work account through Microsoft Graph with a separate access token;
it MUST NOT trust `upn` or an unverified `email` claim.

The grant records `amr=id_token` and `idp=google` or `idp=microsoft`.

## 5. Compatibility

Hosted clients MAY keep convenience methods such as `sendOtp` / `verifyOtp`
that map onto create/respond challenge calls.

The SComm hosted profile also serves `POST /v1/otp/request`,
`POST /v1/otp/verify`, `POST /v1/idtoken/challenge`, and
`POST /v1/idtoken/verify`. They are aliases for the two types above and are
removed one SDK minor version after the challenge route ships.
