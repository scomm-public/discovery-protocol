# Privacy considerations

Discovery is associated with a mailbox. The directory lookup key is an OPRF
identity, not the mailbox address.

## Lookup

The client blinds the canonical mailbox (RFC 9497 base OPRF,
ristretto255-SHA512, mode `0x00`) and sends only the blinded element to
`POST /v1/id/oprf/evaluate`. Finalize stays on the client. The directory
stores and serves documents under `identity_id` (the leftmost 32 bytes of
Finalize, lowercase hex).

A directory log can learn:

```text
client X submitted a blinded element, then fetched identity_id Z
```

It does not learn the mailbox address from that exchange. The mailer, which
sends mailbox OTP, is a separate host and is the component that sees the
address.

IP addresses, user agents, and repeat-query timing can still correlate a
client. Caching repeated lookups reduces how often a client contacts the
directory.

## Published document contents

A Discovery Document can itself leak sensitive metadata: preferred languages, forms that imply a medical or legal context, security requirements, or organizational policies. Mailbox owners SHOULD treat published capabilities as public unless a future confidentiality mechanism exists (none is specified in this draft).

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
