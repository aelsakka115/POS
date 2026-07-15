/**
 * ITenantContext — resolves and applies tenant identity for every request.
 * No concrete implementation exists yet.
 *
 * Deliberately interface-only. RFC-004 §1.4 defers "the exact technique
 * for injecting tenant identity into each query's context" to a future
 * Infrastructure document — this file must not reintroduce that leak by
 * hardcoding a mechanism here. A concrete implementation is written when
 * the first domain use case actually needs to enforce tenant isolation,
 * not speculatively during Bootstrap.
 */
export interface TenantContext {
  readonly tenantId: string;
}

export interface ITenantContextResolver {
  /** Resolve tenant identity from an authenticated request. Mechanism-agnostic. */
  resolve(request: unknown): Promise<TenantContext>;
}

export interface ITenantContextApplier {
  /** Apply the resolved tenant context to a database session/query. Mechanism-agnostic. */
  apply(context: TenantContext): Promise<void>;
}
