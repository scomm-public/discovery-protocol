# Privacy considerations

Discovery is associated with a mailbox. The directory lookup key is the
unsalted SHA-256 of the canonical mailbox (`mailboxSha256`), not the
address itself and not a vault OPRF identity.

## Lookup

The client hashes the canonical mailbox locally and fetches
`GET /v1/mailboxes/{mailboxSha256}` or `GET /v1/keys?sha256=`. A directory
log can learn that a client queried that digest. Anyone who can guess an
address can compute the same digest. This is a public existence signal
for published keys. It is not a vault capability.

The mailer, which sends mailbox OTP, is a separate host and is the
component that sees the address on OTP request.

## Published document contents

A Discovery Document can itself leak sensitive metadata: preferred languages, forms that imply a medical or legal context, security requirements, or organizational policies. Mailbox owners SHOULD treat published capabilities as public unless a future confidentiality mechanism exists (none is specified in this draft). Documents contain `mailboxSha256` and MUST NOT contain a mailbox address.

Private account state managed via authenticated APIs (encrypted vaults, recovery envelopes) MUST NOT be mirrored into the public Discovery Document. See [resources.md](resources.md) visibility rules and [http-api.md](http-api.md).

Clients SHOULD avoid copying Discovery Documents into unrelated telemetry.

## Future mitigations (not specified here)

Later protocol work MAY need:

- caching (so repeated composition does not repeat network lookups);
- proxying or recursive resolvers that hide the original client;
- privacy-preserving lookup (for example, PIR, oblivious DNS-like designs, or batched queries);
- distributed or federated resolution so no single log contains all queries;
- minimization of server-visible metadata (no unnecessary headers, padded queries, or coarse timing).

None of these is selected or designed in protocol `0.1-draft`. The requirement for now is that specifications and implementations **acknowledge** the leak rather than assuming discovery queries are harmless.

## Interaction with security

Privacy-preserving lookup MUST NOT be used as a reason to skip authenticity once authenticity exists. A private query that returns an attacker-controlled document is still a key-substitution failure. See [security-considerations.md](security-considerations.md).
