import { z } from "zod";

/**
 * Every event and every persisted contract in this project is tenant-scoped.
 * This is not a business rule invented here — it reflects Product Bible's
 * multi-tenancy model and RLS policy, applied identically everywhere.
 */
export const tenantScopedBase = z.object({
  tenantId: z.string().uuid(),
});

/**
 * Standard ID type used across all domain contracts.
 */
export const entityId = z.string().uuid();

/**
 * ISO 8601 timestamp, used for every `*At` field across all events
 * (createdAt, completedAt, recordedAt, etc. — RFC-002).
 */
export const isoTimestamp = z.string().datetime();

export type TenantScoped = z.infer<typeof tenantScopedBase>;
