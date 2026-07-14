<!--
This template operationalizes RFC-005 §3.1 (Definition of Ready).
It does not define requirements — it verifies that requirements already exist and are unambiguous.

Do not fill this in from memory or assumption. Every field must trace to a document.
If it doesn't, the task is Not Ready — go fix the documentation gap first (RFC-005 §5 or §6),
then come back to this template.

Title, labels, assignee, and priority are handled by GitHub's native issue fields — do not duplicate them here.
-->

## 1. Domain(s) Involved

<!-- Exact domain name(s) as they appear in RFC-001. If more than one, this is a strong signal to double-check Section 5 below. -->

## 2. Domain Document Reference

**Is the relevant section of the Domain Document written, frozen, and unambiguous for this specific task?**

- [ ] Yes
- [ ] No

**Link / section reference (required if Yes):**
<!-- e.g. Domain-Sales.md §5 Business Rule #12 -->

> If you checked "No," or if you cannot provide a specific reference, stop here. The task is **Not Ready**. Resolve the gap via RFC-005 §5 (Change Management) or §6 (Engineering Decision Process) before proceeding.

## 3. Contracts Check (Events / Capability IDs)

**Are all events and Capability IDs this task needs already documented in RFC-002 / RFC-003?**

- [ ] Yes — all required events/Capability IDs already exist
- [ ] No — at least one is missing
- [ ] N/A — this task does not touch events or Capability IDs

**If any are missing, list them here (this alone makes the task Not Ready):**
<!-- -->

## 4. Acceptance Criteria

<!--
Each line below must be a verification check that proves an EXISTING Business Rule was implemented correctly —
not a new requirement, not an interpretation, not a "should probably also."

Format: [Acceptance Criterion] — traces to [Domain Document §X, Business Rule #Y]

If you cannot write the "traces to" part for a criterion, remove the criterion.
If the task has no criterion that traces to a documented rule, the task is Not Ready.
-->

- [ ] _Criterion_ — traces to _Domain-___.md §_, Business Rule #_
- [ ] _Criterion_ — traces to _Domain-___.md §_, Business Rule #_

## 5. Cross-Domain Boundary Check

**If this task touches more than one domain, is the responsibility split between them already explicit in RFC-001?**

- [ ] Yes
- [ ] No
- [ ] N/A — single domain only (Section 1 lists one domain)

> If "No," the task is **Not Ready** — the boundary must be clarified in RFC-001 first, not decided during implementation.

---

## 6. Readiness Verdict

<!-- Fill this in last, after completing 1–5. -->

**Is this task Ready to start?**

- [ ] **Ready** — every section above is Yes or N/A, with references.
- [ ] **Not Ready** — at least one section above is No or missing a reference.

**If Not Ready, what specifically is missing and where must it be resolved?**
<!-- e.g. "Missing Business Rule for refund disposition on partial cancellations — needs RFC-005 §6 decision before this task can start." -->
