/**
 * Base class for any error raised from within a Domain Layer (RFC-004 §6.1).
 * Every domain-specific error (e.g. `ShiftNotOpenError`, `InsufficientStockError`)
 * extends this — never a raw string or a generic Error.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
