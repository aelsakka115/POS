# @cafe-engine/ui

Shared design-system components and Design Tokens (RFC-004 §10, RFC-004 §4).
shadcn/ui components live here, added incrementally as real screens need
them — none exist yet as of Bootstrap.

## Known Bootstrap-phase tooling coupling (not architectural)

`components.json` currently points to `apps/web/tailwind.config.ts` and
`apps/web/src/index.css` so the shadcn CLI has a Tailwind config to read
theme values from. This is **tooling coupling, not a code/runtime
dependency** — verified during the Phase 5 architecture review: it is
never touched at build, typecheck, or package resolution time.

**This is temporary, kept under YAGNI for Bootstrap.** The long-term target
remains:

```
packages/*   → fully independent
apps/*       → consume packages only, never the reverse
```

**TODO:** once `packages/ui` holds real shared components and finalized
Design Tokens, give this package its own self-contained Tailwind config
and remove the `apps/web` path reference from `components.json`.

## Structure

```
src/
├── lib/cn.ts     # shadcn's class-merge utility — the only piece populated so far
└── index.ts       # barrel export
```
