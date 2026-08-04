<!--
This template operationalizes RFC-004 (Software Architecture) and RFC-005 (Engineering Workflow).
Do not remove sections. If a section is not applicable, mark it explicitly as N/A with a one-line reason.
-->

## 1. Summary

**What does this PR do?**
<!-- One or two sentences. No implementation narration — the diff already shows that. -->

**Related Domain(s):**
<!-- e.g. Sales, Inventory. If more than one domain is touched, explain why in one line. -->

**Related RFC(s) / Domain Document(s):**
<!-- e.g. Domain-Sales.md §6.1, RFC-002 §4.2 -->

---

## 2. Architecture Checklist

- [ ] **Domain boundaries respected** — this PR does not implement responsibilities owned by another domain (RFC-001).
- [ ] **Dependency Rules satisfied** — no file in this PR imports another domain's `domain/`, `application/`, or `infrastructure/` folder directly (RFC-004 §5.2).
- [ ] **No direct cross-domain imports** — any cross-domain data need is satisfied via a Read Model or an event, not a direct call or a JOIN across domain tables (RFC-004 §5.2, §3.3).
- [ ] **No business rules duplicated** — no business rule already defined in another domain's Domain Document is re-implemented here.
- [ ] **Capability gating implemented where required** — every new/changed endpoint or UI element tied to a Capability ID from RFC-003 checks it explicitly (RFC-003 §10, RFC-004 §6.5/§7.4).
- [ ] **Events and contracts match RFC-002 / RFC-003** — every event name, payload field, and Capability ID used here matches `packages/domain-contracts` exactly, with no local re-definition or renaming.
- [ ] **Offline-first authority respected** — affected operational writes use Branch Edge; Cloud/master-data writes and sync use the ownership, Outbox/Inbox, and idempotency rules in RFC-006 (or mark N/A).

If any box above is unchecked, explain why in **Reviewer Notes**.

---

## 3. Testing Checklist

- [ ] Appropriate tests added or updated for the behavior in this PR (RFC-004 §8).
- [ ] Existing tests pass locally / in CI.
- [ ] No known regression introduced (or, if one exists, it is explicitly called out below with justification).
- [ ] For RFC-006-affected work, Offline/restart/retry/reconnect/staleness scenarios appropriate to the scope pass (or mark N/A with reason).

---

## 4. Documentation Checklist

- [ ] **Documentation updated if behavior changed** — if this PR changes any documented behavior, the relevant Domain Document is updated in this same PR (RFC-005 §4.1 — no deferred documentation debt).
- [ ] **If business behavior changed, the Change Management Process was followed** — link the approval/decision below (RFC-005 §5). Leave unchecked + explain if this PR is purely technical (RFC-005 §4.2 exception).
- [ ] **If a new architectural pattern was introduced, a new SA-ADR is proposed instead of silently implemented** — link the proposed SA-ADR below (RFC-004 §14, RFC-005 §6.1). If nothing new was introduced, mark N/A.

**Links (Change Management approval / proposed SA-ADR, if applicable):**
<!-- -->

---

## 5. Reviewer Notes

<!--
- Anything the reviewer should pay special attention to.
- Any unchecked box above, explained.
- Any open question that should go through RFC-005 §6 (Engineering Decision Process) before merge.
-->
