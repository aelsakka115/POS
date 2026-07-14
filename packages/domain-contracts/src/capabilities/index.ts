/**
 * Capability IDs — populated incrementally, one domain at a time.
 *
 * HARD RULE (Repository-Bootstrap-Plan.md, Adjustment 1):
 * No application code may define or hardcode a Capability ID string
 * outside this package. Every Capability ID here must match RFC-003 §6
 * exactly (same prefix, same PascalCase name).
 *
 * When the Sales domain is implemented, its capabilities (SALES.POS,
 * SALES.Discounts, SALES.Refunds — per RFC-003 §6) are added here.
 *
 * Currently populated domains: (none yet — Bootstrap only)
 */

export {};
