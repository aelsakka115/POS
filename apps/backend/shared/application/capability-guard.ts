import type { Result } from "../../shared/domain/result.js";
import { DomainError } from "../../shared/domain/domain-error.js";

/**
 * ICapabilityGuard — the single enforcement contract for RFC-003 §10 Rule 5:
 * "APIs depend on Capabilities. An unactivated Capability returns an
 * explicit rejection, never a silent empty result."
 *
 * No concrete implementation exists yet — no domain has populated
 * Capability IDs during Bootstrap (Repository-Bootstrap-Plan.md
 * Adjustment 1), so there is nothing concrete to check against.
 * The interface exists now so every future domain's `api/` layer depends
 * on the same contract; the concrete implementation (where activation
 * state lives, how it's looked up) is written when Sales — the first
 * domain with real Capability IDs — actually needs it.
 */
export class CapabilityNotEnabledError extends DomainError {
  readonly code = "CAPABILITY_NOT_ENABLED";
  constructor(public readonly capabilityId: string) {
    super(`Capability "${capabilityId}" is not enabled for this tenant.`);
  }
}

export interface ICapabilityGuard {
  assertEnabled(
    tenantId: string,
    capabilityId: string,
  ): Promise<Result<true, CapabilityNotEnabledError>>;
}
