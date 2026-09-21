# Privacy considerations

Discovery is associated with a mailbox. The act of **looking up** that mailbox can leak communication intent even when the resulting document is public.

This is a protocol-level concern. It does not depend on a particular vendor.

## Lookup leakage

A resolver that receives a query can learn:

```text
client X queried mailbox Y
```

possibly with timestamps, IP addresses, user agents, and repeat-query patterns. A centralized resolver makes this especially concentrated: one operator could observe large-scale social and business graphs.

Even a distributed design can leak intent to:

- authoritative DNS operators;
- HTTPS well-known hosts;
- mailbox providers;
- CDNs and reverse proxies;
- on-path network observers, if lookup is not protected.

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
