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
| `pqc-mldsa65` | ML-DSA-65 (FIPS 204) S/MIME verification key |
| `openpgp-mldsa65-ed25519` | RFC 9980 composite: ML-DSA-65 and Ed25519 |

`openpgp-mldsa65-ed25519` public material is an OpenPGP version 6 primary-key packet, algorithm 30. The key material is the 32-octet Ed25519 public key followed by the 1,952-octet ML-DSA-65 public key. The self-signature carries the ML-DSA-65 signature in `value` and the Ed25519 signature in `ed25519_value`. Both signatures cover the same artifact proof bytes. Either failure rejects the artifact.

## Encryption

Encryption artifacts use a decrypt challenge. The client proves it can recover the server nonce.

| Algorithm | What it is |
| --- | --- |
| `openpgp-cv25519` | Curve25519 OpenPGP encryption subkey |
| `smime-x25519` | X25519 S/MIME key agreement |
| `openpgp-mlkem768-x25519` | ML-KEM-768 combined with X25519 (OpenPGP) |
| `smime-mlkem768-x25519` | ML-KEM-768 combined with X25519 (S/MIME) |

## Rejection

A service that implements this profile MUST reject publication of any algorithm not in the tables above with `unsupported_algorithm`. Clients MUST advertise only algorithms from these tables for the families they implement.
