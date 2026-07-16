# Repository Bootstrap Plan

**Type:** Execution Plan (not an RFC, not governance)
**Depends on:** RFC-004 (structure/stack), RFC-005 + Repository Artifacts (already complete)
**Purpose:** The exact, ordered sequence to take this repository from empty to "ready for first domain implementation" (Sales, per RFC-004 §13). Executed step-by-step, not redesigned mid-flight.

---

## Phases, Order, and Dependencies

| # | Phase | Depends on | What happens |
|---|---|---|---|
| **0** | **Repository Init** | — | Create repo, push existing governance artifacts (`docs/` with all RFCs & Domain Documents, `.github/` templates, `CODEOWNERS`, `CONTRIBUTING.md`). First commit. |
| **1** | **Monorepo Skeleton** | 0 | Workspace tooling (package manager + workspaces), root `tsconfig`, empty folder structure exactly per RFC-004 §4 (`apps/web`, `apps/backend`, `packages/domain-contracts`, `packages/ui`, `packages/config`, `database/`). No logic yet — folders and configs only. |
| **2** | **Domain Contracts Scaffold** | 1 | `packages/domain-contracts` created as a **complete structure** (folders, exports, shared base types, index) and established as the single source of truth from day one — but populated **incrementally**: Event/Capability schemas are added when each domain is implemented, not all 48/46 upfront. **Hard rule from this point forward: no application code may define an Event or Capability shape outside this package** — even a not-yet-populated one. |
| **3** | **Database Bootstrap** | 1 | Initial migration: `event_outbox` table (shared, RFC-004 §3.2) + Platform Domain tables (tenants, branches, users — minimal, schema only). RLS scaffolding per RFC-004 §6.3. No domain-specific tables yet. |
| **4** | **Backend Skeleton** | 2, 3 | **Only three folders** inside `apps/backend`, each with the full four-layer structure (`domain/ application/ infrastructure/ api/`, per RFC-004 §6.1): `shared/` (cross-cutting infrastructure utilities — Outbox publisher, Tenant Context resolution, Capability Guard), `platform/` (Auth/Users/Branches — Core Platform per Product Bible), and `sales/` (first domain to be implemented). The remaining 11 domains are created only when their implementation actually begins — not before. |
| **5** | **Frontend Skeleton** | 2 | Vite + React + TS app shell in `apps/web`, Tailwind + shadcn/ui initialized in `packages/ui`, feature-first empty folders (per RFC-004 §7.1) matching the 13 domains, routing shell, React Query provider. No real screens yet. |
| **6** | **CI & Enforcement Wiring** | 1, 4, 5 | Lint + test runner configured (now that real tooling exists). First CI workflow: lint + typecheck + empty test suite passing. Branch protection enabled, requiring CI + CODEOWNERS review before merge — this is the moment PR Template/Issue Template checklists become enforced, not just advisory. |
| **7** | **Bootstrap Validation** | 0–6 | Final checkpoint (below). If it passes, Bootstrap is Complete. |

**Rule during execution:** phases run in this order, no skipping. If a phase reveals a gap (missing event, missing contract, ambiguous folder ownership), that's an Engineering Decision Process trigger (RFC-005 §6) — stop, resolve, then continue. Don't work around it silently.

---

## Validation Checkpoint per Phase

| # | Checkpoint |
|---|---|
| 0 | Repo exists, `docs/` and `.github/` are present and match what was approved in this project |
| 1 | `apps/`, `packages/`, `database/` exist exactly per RFC-004 §4; workspace installs cleanly with zero packages yet |
| 2 | `packages/domain-contracts` exists as a complete, buildable package structure (folders, index, exports, shared base types) even though it contains zero populated Event/Capability schemas yet; package builds/typechecks with zero errors |
| 3 | Migration applies cleanly to a fresh database; `event_outbox` and Platform Domain tables exist; RLS is present (even if minimal) |
| 4 | `shared/`, `platform/`, and `sales/` exist under `apps/backend`, each with the 4 sub-layers; shared Outbox/Tenant Context/Capability Guard utilities compile; zero cross-domain imports (verified manually or by lint rule); no folder exists yet for the other 11 domains |
| 5 | `apps/web` runs locally and renders an empty shell; 13 feature folders exist; `packages/ui` exports at least one themed component using Design Tokens (RFC-004 §10) |
| 6 | CI pipeline runs on a test PR and passes; branch protection blocks a merge attempt without required checks/review, verified by an actual test PR |

---

## Definition of "Bootstrap Complete"

Bootstrap has **two distinct completion states** — conflating them would mean
declaring success on a condition that was never actually tested.

### Bootstrap Complete (Local)

Everything achievable without a real GitHub repository:

- [x] All 7 phases passed their validation checkpoint.
- [x] `packages/domain-contracts` is the only place any event or Capability ID
      shape is defined — confirmed by inspection.
- [x] No domain-specific business logic has been written — structure and
      contracts only.
- [x] Full local CI sequence (`npm ci → typecheck → lint → build`) runs
      end-to-end successfully.
- [x] Governance artifacts (`docs/`, `CONTRIBUTING.md`, `CODEOWNERS`, PR/Issue
      templates) verified present via the same commands the CI governance
      job runs.

**Status: ✅ Reached.**

### Bootstrap Complete (Verified)

Requires a real GitHub repository — cannot be satisfied locally, regardless
of how much local validation is done:

- [ ] 1. Repository pushed to GitHub.
- [ ] 2. Branch Protection configured per `.github/BRANCH_PROTECTION.md`.
- [ ] 3. `CODEOWNERS` verified active (GitHub recognizes and enforces it).
- [ ] 4. PR Template verified — appears automatically on a new PR.
- [ ] 5. Issue Template verified — appears in the Issue creation flow.
- [ ] 6. CI (`.github/workflows/ci.yml`) runs successfully on GitHub's own
      runners, not just locally.
- [ ] 7. A real test PR opened, passes CI + required CODEOWNERS review, and
      merges successfully.

**Status: ⏳ Pending — requires pushing to GitHub, outside this environment.**

---

**Implementation of the Sales domain does not begin until Bootstrap Complete
(Verified) is reached.** Bootstrap Complete (Local) is a real, meaningful
milestone — it is not the same milestone, and is not sufficient on its own.

---

*This plan is executed as-is. Any deviation discovered mid-execution goes through RFC-005 §6, not an ad-hoc change to this document.*
