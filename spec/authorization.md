# Authorization

**Protocol version:** `0.2-draft`

Authorization is a first-class concept, separate from resources, operations,
and challenges. It answers **why** a mutation is permitted.

MSK is the primary ongoing authority in the **SComm hosted-service profile**.
It is **not** a mandatory identity mechanism for every Discovery Protocol
implementation. Other implementations MAY use WebAuthn, OAuth-bound management
identity, client certificates, or provider attestation under other profiles
without changing the generic HTTP paths.

## 1. Profiles

Provisional profile identifiers:

| Profile URI | Role |
| --- | --- |
| `https://discovery.scomm.ai/auth/msk/v1` | Armed master signing key |
| `https://discovery.scomm.ai/auth/previous-msk/v1` | Prior MSK where lifecycle allows |
| `https://discovery.scomm.ai/auth/challenge/v1` | Satisfied purpose-bound challenge |

Only profiles that correspond to real hosted behavior are defined here.

## 2. SComm MSK signed-request profile

State-changing requests in the hosted profile use a signature from the MSK
algorithm registry over a canonical UTF-8 string (not HTTP `Authorization`
headers by default). The registry is a closed set:

| `signature.algorithm` | Public key | Signature |
| --- | --- | --- |
| `ed25519` | 32-byte RFC 8032 public key | 64-byte RFC 8032 signature |
| `mldsa65-ed25519` | 1,952-byte ML-DSA-65 public key (FIPS 204) concatenated with a 32-byte Ed25519 public key | 3,309-byte ML-DSA-65 signature concatenated with a 64-byte Ed25519 signature |

Both halves of `mldsa65-ed25519` are signatures over the same canonical UTF-8
string. A verifier accepts the request only when both halves verify. This id
is not the OpenPGP mail algorithm `openpgp-mldsa65-ed25519`.

`ed25519` is the enrollment default. A later `replace_msk` may arm
`mldsa65-ed25519`. After arm, the server verifies with the algorithm stored
for that principal and rejects a `signature.algorithm` that does not match it.
Verifiers MUST NOT try every registry id.

The canonical string is:

```text
SComm/Pubkey/{protocol_version}/{operation}
principal={principal-id}
timestamp={unix_ms}
nonce={base64url}
payload_sha256={hex}
```

Where:

- `payload_sha256` is SHA-256 of the RFC 8785 JCS encoding of `payload`;
- `protocol_version` is an integer (currently `1`);
- `operation` is the short operation token (for example `set_keys`);
- timestamp skew is bounded (hosted default ±5 minutes);
- `nonce` provides replay protection.

The HTTP JSON body carries `protocol_version`, `principal`, `operation`,
`timestamp`, `nonce`, `payload`, and `signature: { algorithm, value }`.

Signatures MUST bind the intended operation and payload. Clients and servers
MUST use identical canonicalization. Test vectors:
[`examples/v1/api/signing-vectors.json`](../examples/v1/api/signing-vectors.json).

Do not reinterpret one signed payload as a different operation (operation-type
confusion).

## 3. Challenge profile

After a challenge is `satisfied`, the server MAY authorize a matching
operation for a short window using a server-side binding or a single-use proof
returned to the client. The proof MUST remain purpose-bound.

## 4. Routine vs recovery authority

| Action | Typical auth |
| --- | --- |
| Publish preferences / public keys | MSK |
| Replace MSK when key is lost | Challenge (email OTP) + new MSK PoP |
| Arm first MSK | Challenge (email OTP) + MSK PoP |

OTP MUST NOT become a normal alternative administrative credential for routine
profile mutations.
