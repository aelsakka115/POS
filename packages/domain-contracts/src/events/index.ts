/**
 * Event schemas — populated incrementally, one domain at a time.
 *
 * HARD RULE (Repository-Bootstrap-Plan.md, Adjustment 1):
 * No application code (backend or frontend) may define an Event shape
 * outside this package. Not even temporarily. Not even for a "quick test."
 *
 * When the Sales domain is implemented, its events (OrderPlaced,
 * SaleCompleted, SaleRefunded, DiscountApplied — per RFC-002 §4) are
 * added here as a `sales.ts` file and re-exported below.
 *
 * Currently populated domains: (none yet — Bootstrap only)
 */

export {};
