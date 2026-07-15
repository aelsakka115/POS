/**
 * IOutboxPublisher — the ONLY contract any domain uses to publish an event
 * (RFC-004 §3.2). No concrete implementation exists yet.
 *
 * Per Bootstrap philosophy: this interface exists now so every domain's
 * Application Layer depends on it (Dependency Inversion, RFC-004 §6.2) —
 * but the concrete implementation (which database client, how the write
 * joins the caller's transaction, etc.) is written when the Sales domain's
 * first real use case (e.g. CompleteSaleUseCase) actually needs it, not
 * speculatively during Bootstrap.
 */
export interface OutboxEvent {
  tenantId: string;
  eventName: string;
  payload: Record<string, unknown>;
}

export interface IOutboxPublisher {
  /**
   * Must be called within the same transaction as the business state
   * change it accompanies — this is what makes the Outbox pattern atomic.
   * Enforcing that invariant is the caller's (Application Layer's)
   * responsibility.
   */
  publish(event: OutboxEvent): Promise<void>;
}
