# Errors and abuse signals

**Protocol version:** `0.2-draft`

Every 4xx response uses the envelope:

```json
{
  "error": {
    "code": "not_found",
    "message": "Not found"
  }
}
```

`error.code` is the machine-readable signal. Hidden existence failures use
code `not_found` and message exactly `Not found`.

## 1. Classes and weights

Implementations MUST classify each reject for a DoS agent that tails logs.
`weight` is added per client IP and per subnet (IPv4 `/24`, IPv6 `/64`) over
a sliding window. Suggested bans: IP at weight sum **30** per 60 seconds;
subnet at **200** per 60 seconds.

| class | HTTP | weight | Meaning |
| --- | --- | ---: | --- |
| `malformed` | 400 (also 415) | 1 | Bad JSON, schema, base64, field bounds |
| `auth` | 401 | 3 | Bad signature, grant, OTP, nonce replay |
| `hidden` | 404 | 2 | Existence hide: unknown principal, unarmed MSK on signed mutate, challenge missing or wrong mailbox |
| `lookup_miss` | 404 | 0 | Public directory miss (`GET /v1/msk`, gated key miss). Wire code is still `not_found` |
| `conflict` | 409 | 0 | Post-auth conflict (already armed, already used) |
| `rate` | 429 | 5 | Rate limited |
| 5xx | 5xx | — | Not counted |

Other useful classes (`method` 405, `size` 413/414/431, `clock` for
`timestamp_out_of_window`, `forbidden` for CORS) MAY be logged with
non-zero weight; agents that only implement the table above remain
conformant if they count those statuses under `malformed` or ignore them.

## 2. Existence hiding

Before a caller has authenticated for a principal-scoped resource,
implementations MUST NOT distinguish “does not exist” from “exists but
does not match”. The following MUST return `404` / `not_found` /
`Not found`:

- unknown principal / no row for the identity;
- `master_key_not_armed` on an MSK-signed mutation;
- challenge id not found, or challenge id bound to a different mailbox.

`GET /v1/msk?sha256=` with no armed key MUST return `404` / `not_found`
as a `lookup_miss` (weight 0). Successful challenge **create** stays a
uniform success response whether or not mail was sent
([challenges.md](challenges.md)).

## 3. `http_reject` log line

For every counted or uncounted 4xx reject, the server SHOULD emit one
structured log object:

```json
{
  "event": "http_reject",
  "ip": "203.0.113.9",
  "subnet": "203.0.113.0/24",
  "status": 404,
  "code": "not_found",
  "class": "hidden",
  "weight": 2,
  "reason": "challenge_not_found",
  "route": "/v1/mailboxes/:mailboxSha256/challenges/:id/responses"
}
```

`reason` is operator-only (for example the pre-hide code) and MUST NOT
appear in the HTTP body. `ip` is the client address after trusted proxy
hops. 5xx responses MUST NOT be counted toward ban thresholds.
