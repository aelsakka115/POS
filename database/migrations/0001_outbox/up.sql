-- Migration: 0001_outbox
-- The Transactional Outbox (RFC-004 §3.2) — the mechanism that makes
-- RFC-002 §16 Rule 8 (Per-Tenant Ordered Delivery) real, not just a
-- documented promise.
--
-- One shared table for every domain — not one per domain — so a single
-- Dispatcher can serve the whole platform (RFC-004 §6.3).

create table event_outbox (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  event_name    text not null,
  payload       jsonb not null,
  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

-- The ordering guarantee this table exists to provide is entirely dependent
-- on this index: per-tenant, chronological, unpublished-first.
create index idx_outbox_dispatch
  on event_outbox (tenant_id, created_at)
  where published_at is null;

alter table event_outbox enable row level security;
