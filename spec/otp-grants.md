# Mailer OTP grants

The directory origin serves mailbox OTP. Vault is a different origin
(`https://vault.scomm.ai`, debug `http://127.0.0.1:3001`) and does not send mail.

## Request and verify

`POST /v1/otp/request` body is `{ "email", "purpose" }`. The response is a
uniform `202`. The address is not stored as a directory row.

`POST /v1/otp/verify` body is `{ "sha256", "otp", "purpose" }`. `sha256` is
the unsalted SHA-256 of the canonical mailbox. The response does not contain
an email address.

## Purposes

| Purpose | Who consumes the grant | Mail is sent when |
| --- | --- | --- |
| `enroll` | Directory | The address is deliverable |
| `replace_msk` | Directory, then a vault rebind | An armed directory MSK exists for `sha256` |
| `vault_open` | Vault | An armed directory MSK exists for `sha256` |
| `recovery_envelope` | Vault | An armed directory MSK exists for `sha256` |
| `recovery_generation` | Vault | An armed directory MSK exists for `sha256` |
| `vault_backup` | Vault | An armed directory MSK exists for `sha256` |

If a vault purpose has no armed directory MSK, the request still returns `202`
and no message is sent.

## Vault grant

The directory mailer signs vault-consumed grants. The token format, `jti`
replay, and the vault routes that consume the grant are specified by CKVF
([vault host](https://github.com/scomm-public/ckvf/blob/main/specification/profiles/vault-host.md)).
This document only requires that the mailer produce that grant and that the
grant not contain a mailbox address or `mailboxSha256`.

The signed text, repeated here so the mailer and vault do not drift, is:

```text
Scomm/grant/v1
purpose=<purpose>
identity_id=<64 lowercase hex>
msk_fingerprint=<64 lowercase hex SHA-256 of the armed MSK public key>
exp=<unix ms>
jti=<opaque>
```

`identity_id` is the OPRF identity. The directory mailer learns it by blinding
the canonical mailbox and calling vault `POST /v1/id/oprf/evaluate`. The OPRF
secret stays on vault. The token does not contain the mailbox address or
`mailboxSha256`. Vault checks the signature, purpose, expiry, and `jti`, and
requires the presented MSK to match `msk_fingerprint`.

Directory `enroll` and `replace_msk` grants are opaque tokens inside the
directory process. They are bound to `sha256`, not to `identity_id`.
