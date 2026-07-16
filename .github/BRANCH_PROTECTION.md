# Branch Protection Requirements

This repository has not been pushed to GitHub yet, so these settings cannot
be configured in code. Apply them manually on the default branch once the
repository exists on GitHub (Settings → Branches → Branch protection rules).

## Required rule for the default branch (`main`)

- [ ] **Require a pull request before merging** — no direct pushes.
- [ ] **Require status checks to pass before merging**, with these checks required:
  - `Install, Typecheck, Lint, Build` (from `.github/workflows/ci.yml`)
  - `Governance Artifacts Present` (from `.github/workflows/ci.yml`)
- [ ] **Require branches to be up to date before merging.**
- [ ] **Require review from Code Owners** — enforces `CODEOWNERS` (RFC-005 §5/§6 authority).
- [ ] **Do not allow bypassing the above settings** — including for repository admins, per RFC-005 §5.3 (Lead Architect approval authority is exercised *through* review, not by bypassing checks).

## Why this isn't automated

GitHub does not provide a way to configure branch protection from a
committed file (unlike CI workflows). It must be set once, manually, in
repository settings, after the first push. This file exists so that step
isn't forgotten or informally skipped.
