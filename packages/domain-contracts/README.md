# @cafe-engine/domain-contracts

The single source of truth for every Event (RFC-002) and Capability ID (RFC-003)
in this project. Consumed by both `apps/backend` and `apps/web`.

## The hard rule

> No application code may define an Event or Capability shape outside this package.

This applies from the very first line of domain code, even before this package
is fully populated. If a domain you're implementing needs an event or capability
that isn't here yet, add it here first — don't inline a shape locally "for now."

## Structure

```
src/
├── shared/           # Generic helpers every event/capability uses (defineEvent, base types)
├── events/           # One file per domain, added when that domain is implemented
├── capabilities/      # One file per domain, added when that domain is implemented
└── index.ts           # Barrel export — the only import path other packages use
```

## Population status

Populated incrementally, one domain at a time, in implementation order
(RFC-004 §13). See `events/index.ts` and `capabilities/index.ts` for the
current list of populated domains.
