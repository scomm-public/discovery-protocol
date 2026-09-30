# Publication algorithms

**Document status:** Early draft  
**Protocol version:** `0.2-draft`

This profile lists the algorithms a discovery service accepts when a mailbox publishes a verification key or an encryption key. It is the closed set for new publication. The JSON catalog may still contain older identifiers so a previously stored row can be read. Those older identifiers are not publication algorithms.

A name is added here only when both of these are true:

- the service runtime can check proof of possession for it;
- a client can generate it and use it.

## Signing

Verification artifacts (`purpose=verify`) use a self-signature over the artifact proof bytes.

| Algorithm | What it is |
| --- | --- |
| `openpgp-ed25519` | Ed25519 OpenPGP verification key |
| `smime-ed25519` | Ed25519 S/MIME verification key (`id-Ed25519`, no digest) |
| `smime-ed25519` | Ed25519 S/MIME verification key (`id-Ed25519`, no digest) |
| `pqc-mldsa65` | ML-DSA-65 (FIPS 204) S/MIME verification key |
| `openpgp-mldsa65-ed25519` | RFC 9980 composite: ML-DSA-65 and Ed25519 |

`openpgp-mldsa65-ed25519` public material is an OpenPGP version 6 primary-key packet, algorithm 30. The key material is the 32-octet Ed25519 public key followed by the 1,952-octet ML-DSA-65 public key. The self-signature is `{ "format": "openpgp-signature", "value": "<base64url>" }`. `value` is one detached OpenPGP version 6 signature packet over the artifact proof bytes. The packet uses a hash of at least 256 bits and a critical notation `scomm-pop@scomm.ai`. The service rejects the artifact unless both signature components verify and the issuer fingerprint matches the key. `ed25519_value` is not accepted.

`openpgp-ed25519` and `openpgp-cv25519` are the same publication names for RFC 4880 version 4 keys and for RFC 9580 version 6 classical Ed25519/X25519 keys. The packet version lives in the key material. A service does not add a separate algorithm name for the v6 classical profile.

## Encryption

Encryption artifacts use a decrypt challenge. The client proves it can recover the server nonce.

| Algorithm | What it is |
| --- | --- |
| `openpgp-cv25519` | Curve25519 OpenPGP encryption subkey |
| `smime-x25519` | X25519 S/MIME key agreement |
| `openpgp-mlkem768-x25519` | ML-KEM-768 combined with X25519 (OpenPGP) |
| `smime-mlkem768-x25519` | ML-KEM-768 combined with X25519 (S/MIME) |

`openpgp-mlkem768-x25519` public material is an OpenPGP encryption subkey, algorithm 35. The key material is the 32-octet X25519 public key followed by the 1,184-octet ML-KEM-768 encapsulation key. The challenge is `openpgp_message`, a base64url OpenPGP message. A version 6 subkey is challenged with a version 6 public-key encrypted session key packet and a version 2 integrity-protected data packet (AES-256, OCB). A version 4 subkey is challenged with a version 3 public-key encrypted session key packet and a version 1 integrity-protected data packet (AES-256). The literal data is the nonce. The client returns that nonce as the decrypt proof. A raw X25519 share or a SHA-256 concatenation is not a valid challenge.

Algorithm 35 is accepted on an OpenPGP version 4 or version 6 encryption subkey. Algorithms 30 and 36 are accepted only on version 6 keys. This profile does not publish algorithms 31, 32, 33, 34, or 36; a service rejects those names with `unsupported_algorithm`.

## Rejection

A service that implements this profile MUST reject publication of any algorithm not in the tables above with `unsupported_algorithm`. Clients MUST advertise only algorithms from these tables for the families they implement.
