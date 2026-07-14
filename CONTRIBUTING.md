# Contributing to Cafe Engine

This document answers one question: **if you just opened this repository, what do you need to know before writing your first line of code?**

It is a navigation guide, not an architecture document. Every rule mentioned here is defined in full elsewhere — this file only tells you where to look and in what order.

---

## 1. What This Project Is

Cafe Engine is a multi-tenant SaaS Cafe Operating System, built as a **Modular Monolith** with **Event-Driven** communication between domains. It is designed to expand beyond cafés into other verticals later, without rewriting the core.

For the full business context, read the **Product Bible** — it is not repeated here.

---

## 2. Required Reading Order

Before writing any code, read the following **in this exact order**. This is not a suggestion — it is required by RFC-005 §2.3 (Session Bootstrapping) for every human contributor and every AI agent.

1. **Product Bible** — what we're building and why
2. **RFC-001** — domain boundaries (Context Map)
3. **RFC-002** — event catalog (every event, publisher, subscriber)
4. **RFC-003** — capability & subscription architecture
5. **Master-System-Flow.md** — the consolidated end-to-end picture
6. **RFC-004** — software architecture (how we build)
7. **RFC-005** — engineering workflow (how we work)
8. **The specific Domain Document** for whatever you're about to touch (e.g. `Domain-Sales.md`)

Skipping steps is the single most common cause of PRs that violate domain boundaries.

---

## 3. Repository Structure

```
cafe-engine/
├── apps/
│   ├── web/                # React frontend (feature-first, RFC-004 §7)
│   └── backend/             # Domain logic (4-layer structure per domain, RFC-004 §6)
├── packages/
│   ├── domain-contracts/   # THE single source of truth for event/type shapes — start here for any API question
│   ├── ui/                 # Shared design-system components
│   └── config/              # Shared eslint/tsconfig/tailwind
├── database/
│   └── migrations/          # Grouped by domain
├── docs/                    # Every RFC and Domain Document — the living architecture
└── .github/                 # PR/Issue templates, CI, CODEOWNERS
```

Full explanation of every folder: **RFC-004 §4**.

---

## 4. Development Workflow

*(What to do next — the execution sequence.)*

1. Read the relevant Domain Document for the domain you're touching.
2. Confirm the task satisfies **Definition of Ready** (RFC-005 §3.1) — if it doesn't, stop and resolve the ambiguity first, don't guess.
3. Implement, respecting the layer and dependency structure (RFC-004 §5, §6).
4. Confirm the task satisfies **Definition of Done** (RFC-005 §3.2).
5. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md` — fill in every section.
6. Wait for review. Unresolved architectural questions go through RFC-005 §6 (Engineering Decision Process) before merge, not after.

Full detail: **RFC-005 §2.2, §3**.

---

## 5. Rules You Must Never Break

*(Non-negotiable constraints — regardless of workflow, regardless of deadline.)*

- **No direct cross-domain imports.** Ever. Cross-domain data needs go through a Read Model or an event (RFC-004 §5.2).
- **No business rule is re-implemented outside the domain that owns it.** If you need it, consume it — don't duplicate it.
- **No new event or Capability ID is invented silently, and none is ever defined outside `packages/domain-contracts`.** It must exist in RFC-002/RFC-003 first, then be added to `packages/domain-contracts` — never inlined locally in `apps/backend` or `apps/web`, not even temporarily (RFC-005 §6.1; see `packages/domain-contracts/README.md`).
- **No business behavior changes without the Change Management Process.** No exceptions for "small" changes (RFC-005 §5).
- **No deferred documentation.** If behavior changes, the Domain Document updates in the same PR (RFC-005 §4.1).
- **No frozen ADR is overridden.** Not by a new feature, not by a workaround, not "just this once."
- **When in doubt, stop and ask.** This single rule overrides every other instinct to keep moving. It is repeated deliberately across RFC-004 and RFC-005 because it is the most important one.

---

## 6. Where to Find More Information

| Question | Go to |
|---|---|
| What does this domain own, and what's out of scope? | The relevant `Domain-*.md` |
| What event am I supposed to publish/consume, and with what shape? | RFC-002, `packages/domain-contracts` |
| Is this feature gated behind a Capability ID? | RFC-003 |
| How should I structure this code (layers, folders, naming)? | RFC-004 §4–§9 |
| How do I refactor safely? | RFC-004 §9 |
| What are the design system rules for this UI? | RFC-004 §10 |
| How do I propose a new architectural pattern? | RFC-004 §14 (SA-ADR), RFC-005 §6 |
| How do I propose a business rule change? | RFC-005 §5 (Change Management Process) |
| What must every PR include? | `.github/PULL_REQUEST_TEMPLATE.md` |
| Is my task actually ready to start? | RFC-005 §3.1 (Definition of Ready) |

---

*This file is intentionally short. If you find yourself needing to explain architecture here, that content belongs in RFC-004 or a Domain Document instead — open a PR to fix the RFC, not this file.*
