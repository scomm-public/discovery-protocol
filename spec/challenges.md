# Challenges

**Protocol version:** `0.2-draft`

Challenges prove a precondition for a later operation (for example mailbox
control) without making the challenge mechanism a permanent top-level protocol
primitive for every capability.

Email OTP is **one** challenge type. Future types MAY include recovery codes,
WebAuthn, existing-device approval, or out-of-band approval.

## 1. Lifecycle

Create:

```http
POST /v1/identities/{identity_id}/challenges
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
POST /v1/identities/{identity_id}/challenges/{challengeId}/responses
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
GET /v1/identities/{identity_id}/challenges/{challengeId}
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
equivalent).

## 4. Compatibility

Hosted clients MAY keep convenience methods such as `sendOtp` / `verifyOtp`
that map onto create/respond challenge calls.
