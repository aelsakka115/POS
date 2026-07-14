-- Migration: 0000_platform
-- Platform Domains (Product Bible §5.3): Tenants, Branches, Users — minimal
-- schema only. Auth/Roles/Permissions detail is deferred; these tables exist
-- so every domain table can reference tenant_id/branch_id from day one.
--
-- This migration does NOT implement any Core Business Domain. It is the
-- foundational layer every future domain migration depends on.

create extension if not exists "pgcrypto";

-- ── Tenants ──────────────────────────────────────────────────────────────
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_at    timestamptz not null default now()
);

-- ── Branches ─────────────────────────────────────────────────────────────
create table branches (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_branches_tenant on branches(tenant_id);

-- ── Users (minimal — Auth detail deferred, RFC-004 §1.4) ───────────────────
create table users (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  email         text not null,
  created_at    timestamptz not null default now(),
  unique (tenant_id, email)
);

create index idx_users_tenant on users(tenant_id);

-- ── Row-Level Security scaffolding (RFC-004 §6.3) ───────────────────────────
-- Policy logic (how tenant identity reaches the session) is an Infrastructure
-- concern (RFC-004 §1.4) — enabled here, defined precisely later.
alter table branches enable row level security;
alter table users enable row level security;
