# RFC-006: Offline-First Branch Edge Architecture

**Type:** RFC (Deployment, Synchronization, and Operational Resilience)
**Status:** **Approved by Change Management Issue #5 — implementation requires separate Engineering Tasks**
**Audience:** Backend, Frontend, Platform, Operations, Security, and every AI Agent working on Cafe Engine

---

## 1. Context and Decision

Cafe Engine must keep the core cafe operating cycle available for multiple days without Internet. A branch may have several cashier, kitchen, and manager devices that must share one consistent operational state over the local network.

The MVP is therefore **Offline-first at the branch** and **Cloud-managed centrally**:

- A vendor-managed `Branch Edge Service` runs on one primary Windows computer per branch.
- One local PostgreSQL database is shared by branch clients through the Edge API over LAN.
- Supabase/PostgreSQL remains the central Cloud platform for central administration, fleet control, consolidated reporting, and durable off-site data.
- Operational commands commit locally first. Cloud connectivity is not a precondition for Shift, Order, Fulfillment, Sale, externally confirmed payment recording, or core Inventory operations.
- Synchronization is application-level Outbox/Inbox messaging. Bidirectional PostgreSQL replication is prohibited.

Branch Edge is part of the managed Cafe Engine product. It is **not** general customer-managed Self-hosting: customers do not receive an independently deployable Cloud control plane or responsibility for operating the product stack.

## 2. Deployment Topology

```text
Cashier / Kitchen / Manager React clients
                 │ LAN (authenticated HTTPS)
                 ▼
      Branch Edge Service (Windows Service)
                 │
        Local Branch PostgreSQL
                 │ durable Outbox / Inbox
                 ▼ Internet when available
          Cloud Sync API / Workers
                 │
       Supabase Cloud PostgreSQL
                 │
 Central Admin / Consolidated Reporting
```

Rules:

1. Branch clients call the Edge API; they never connect directly to local or Cloud PostgreSQL.
2. Operational POS traffic has no direct Cloud fallback in MVP. A Cloud outage or Internet outage must not change the local command path.
3. The Edge binds permanently to one `tenantId` and `branchId`. Rebinding requires an audited administrative recovery procedure.
4. All Domain and Application code remains deployment-neutral. Edge and Cloud differences live in Infrastructure and composition roots.

## 3. Authority and Single-Writer Ownership

| Data category | Authoritative writer | Offline behavior |
|---|---|---|
| Orders, Sales, Shifts, Fulfillment state | Owning Branch Edge | Created and completed locally; synchronized upstream |
| Branch operational Stock Movements, counts, and availability | Owning Branch Edge | Recorded locally; synchronized upstream |
| Menu definitions, current/future prices, Settings, roles, permissions, employee access state | Cloud control plane | Edge uses the latest versioned snapshot received before disconnection |
| Consolidated reports and fleet status | Cloud | Read-only projections; show staleness while a branch is disconnected |

Single-writer ownership prevents conflicts; timestamps do not decide ownership. **Last-write-wins is prohibited** for orders, sales, payments, shifts, stock movements, and any financial record. Financial and inventory corrections use explicit immutable compensating events.

Central writes received by an Edge never overwrite branch-owned operational records. Branch writes never mutate Cloud-owned master/configuration records.

## 4. Synchronization Contract

Every synchronized message uses this transport envelope in addition to the unchanged Domain Event payload:

```text
syncMessageId       globally unique delivery/message identifier
eventId             stable Domain Event identifier; unchanged across retries
tenantId            owning tenant
branchId            owning/source branch
originNodeId        stable identity of the producing Edge or Cloud node
originSequence      strictly increasing sequence scoped to tenantId + branchId + originNodeId
schemaVersion       positive integer version of the serialized message contract
occurredAt          business occurrence time
recordedAt          durable local recording time
payload             versioned Domain Event or configuration snapshot
```

`syncMessageId`, `originNodeId`, `originSequence`, and `schemaVersion` are synchronization metadata and do not change the 48 RFC-002 business Event names or their Domain payload ownership.

### 4.1 Edge to Cloud

- The local business write and Edge Outbox row commit in one PostgreSQL transaction.
- The uploader sends unpublished messages in `originSequence` order.
- Cloud Inbox has a unique constraint on `syncMessageId` and a second uniqueness guard on `(originNodeId, originSequence)`.
- Cloud acknowledges only after Inbox receipt and all atomic Cloud-side ingestion work commit.
- The Edge marks a message acknowledged only after receiving that durable acknowledgement.

### 4.2 Cloud to Edge

- Cloud publishes versioned configuration/master-data snapshots through a Cloud Outbox.
- Edge Inbox deduplicates `syncMessageId`, rejects a lower/equal snapshot version for the same resource, and applies the snapshot and Inbox acknowledgement atomically.
- A scheduled Menu price already present locally becomes effective from its documented `effectiveFrom`, even while Offline. A schedule created or changed in Cloud after disconnection cannot affect the Edge until synchronized.

### 4.3 Delivery, retries, and compatibility

- Delivery is at-least-once; business effects are exactly-once **semantically** through durable idempotency.
- Retry uses bounded exponential backoff with jitter. Restarting either side must preserve cursors and pending work.
- A sequence gap pauses that origin stream and requests the missing range; later messages from that origin are not applied out of order.
- Producers retain stable `eventId` and `originSequence` across retries.
- Consumers accept the current and immediately previous `schemaVersion`. Unsupported future versions are quarantined and surfaced operationally; they are never silently dropped.
- Poison messages move to a durable quarantine after bounded retries while preserving their sequence and diagnostic context. Financial messages require explicit operator resolution and are never skipped automatically.

## 5. Offline Authentication and Authorization

- Cloud remains authoritative for employee access state, roles, capabilities, and credential provisioning.
- Edge stores only the latest synchronized branch-scoped access projection and a salted, memory-hard password hash of the employee's Offline PIN; plaintext PINs are never stored or synchronized.
- Recommended implementation is Argon2id using parameters recorded with each hash. Authentication attempts are rate-limited and audited locally.
- An Offline credential is valid for at most **7 days since the Edge last successfully synchronized the employee access projection**. After expiry, an already-open operational session may finish its active order but no new Offline login is allowed until synchronization.
- Employee deactivation or capability removal takes effect at the Edge on the first successful synchronization. The bounded revocation window during an outage is an accepted Offline trade-off and must be visible in security/audit reporting.
- Every Offline command records `employeeId`, Edge identity, local timestamp, and authorization snapshot version.

## 6. Payments

- Cash payments may be accepted and recorded fully Offline.
- An external card/wallet payment may be recorded Offline only after the independent payment terminal/provider has confirmed it. Cafe Engine stores the provider reference and confirmation evidence supplied by the operator/integration.
- Cafe Engine never performs or claims Offline card authorization in MVP.
- A failed or unknown external authorization must not be represented as `SaleCompleted` with an approved payment.

## 7. Security and Tenant Isolation

- Each Edge has a unique device identity and rotatable credential issued by the Cloud control plane.
- Edge/Cloud synchronization uses mutually authenticated encrypted transport. Secrets are stored using Windows-protected machine storage, not repository files or plaintext configuration.
- LAN clients authenticate to the Edge API. Database ports are not exposed beyond the trusted branch host/network boundary.
- Every table remains tenant-scoped. Branch-owned operational tables additionally carry `branch_id`; RLS and Application authorization enforce the Edge binding and authenticated context.
- Clock skew is monitored. Ordering relies on `originSequence`, never on wall-clock timestamps.

## 8. Backup, Restore, and Failure Model

- MVP accepts one primary Edge host per branch; automatic failover is out of scope.
- Edge creates an encrypted nightly base backup plus continuous WAL archive with a maximum 15-minute archive interval. The local backup target must be a separate protected volume/device from the PostgreSQL data volume; encrypted off-site copies upload when connected.
- MVP recovery targets are **RPO ≤ 15 minutes** for an Edge-host failure and **RTO ≤ 4 hours** when a prepared replacement Windows host and backup are available. Internet outage alone has RPO 0 for committed local operations.
- Restore targets a clean replacement host, restores PostgreSQL plus sync state atomically, retains the stable branch identity under an audited recovery authorization, and resumes from the last durable Inbox/Outbox cursors.
- Restore validation must prove that acknowledged events are not resent with new identifiers and unacknowledged events are not lost.
- Edge health reports disk capacity, database health, backup age, Outbox backlog, last Cloud contact, and clock skew.

## 9. UX and Reporting Semantics

- Operational screens show `Online`, `Offline`, `Syncing`, or `Sync Attention Required` without blocking local work merely because Cloud is unavailable.
- Central dashboards expose `lastSyncedAt` and branch connectivity state. Data from a disconnected branch is explicitly stale and must never be presented as live.
- Consolidated reports converge after synchronization. Branch-local operational reports may use the local database while Offline.

## 10. MVP Exclusions

- Customer-managed general Self-hosting.
- A database per cashier or peer-to-peer device synchronization.
- Automatic Edge failover or multi-primary Edge databases.
- Direct Cloud POS fallback.
- Bidirectional PostgreSQL replication.
- Offline card authorization by Cafe Engine.
- Offline central administration of all product configuration.

## 11. Implementation Sequence

1. Edge foundation: Windows Service, local PostgreSQL lifecycle, branch binding, LAN API, health, and safe installation/upgrade.
2. Sync foundation: Edge/Cloud Outbox and Inbox, sequence/cursor state, idempotency, retry/quarantine, and configuration snapshots.
3. Offline authentication projection, PIN verification, authorization audit, and credential expiry.
4. Re-baseline Issue #4 so Create Order commits to Branch PostgreSQL and the local Outbox atomically.
5. Sales UI against Edge with visible connectivity/sync state.
6. Apply the same pattern to Fulfillment, Shift, Menu, and Inventory; then validate the complete disconnected operating cycle.

## 12. Acceptance Tests

- Multiple LAN clients complete the core cycle while Internet is unavailable for multiple simulated days.
- Edge restart preserves sequence, pending Outbox messages, Inbox deduplication, and local operation.
- Reconnect converges despite duplicate delivery and connection loss during acknowledgement.
- Sequence gaps, unsupported schemas, and poison messages are visible and never silently skipped.
- Cloud configuration cannot overwrite branch operational data, and Edge writes cannot mutate Cloud-owned configuration.
- Previously synchronized scheduled prices activate Offline at `effectiveFrom`.
- Offline authentication enforces the 7-day window, cached capabilities, rate limits, and audit trail.
- RLS blocks cross-tenant and cross-branch access locally and in Cloud.
- Backup/restore resumes from durable cursors without loss or duplicate business effects.

---

**Decision:** Approved through Issue #5. This RFC supersedes any assumption that MVP branch operation requires continuous Cloud connectivity. It does not authorize implementation until the corresponding Engineering Issues pass RFC-005 Definition of Ready.
