/**
 * Result<T, E> — the explicit success/failure type every Application Layer
 * use case returns, per RFC-004 §8 (Error Handling): no unexpected thrown
 * exceptions for expected failure paths.
 *
 * This lives in shared/domain because it has zero dependencies (no database,
 * no HTTP, no framework) — RFC-004 §6.2.
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
