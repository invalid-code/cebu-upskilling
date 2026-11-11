import { useRateLimitStore } from '../stores/rateLimitStore';

/**
 * Submit cooldown after an HTTP 429 (Requirement 22.4).
 * Disable the submit control while `cooling` is true and show `message` inline.
 */
export function useSubmitCooldown() {
  const cooling = useRateLimitStore((s) => s.active);
  const message = useRateLimitStore((s) => s.message);
  return { cooling, message: cooling ? message : '' };
}
