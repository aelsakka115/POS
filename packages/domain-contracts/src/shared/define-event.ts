import { z } from "zod";
import { tenantScopedBase } from "./base.js";

/**
 * Every event schema in this package MUST be created through this helper.
 * It guarantees `tenantId` is present on every event (RFC-002 §16 Cross-Cutting Rules),
 * without every domain having to remember to add it manually.
 *
 * This file defines HOW an event is shaped — it does not define WHAT any
 * specific event is. Event schemas themselves are added incrementally,
 * one domain at a time, per Repository-Bootstrap-Plan.md Phase 2.
 *
 * Usage (added later, per domain — example only, not a real event):
 *
 *   export const OrderPlaced = defineEvent("OrderPlaced", {
 *     orderId: entityId,
 *     branchId: entityId,
 *     createdAt: isoTimestamp,
 *   });
 */
export function defineEvent<Shape extends z.ZodRawShape>(
  eventName: string,
  payloadShape: Shape,
) {
  return z.object({
    eventName: z.literal(eventName),
    ...tenantScopedBase.shape,
    ...payloadShape,
  });
}
