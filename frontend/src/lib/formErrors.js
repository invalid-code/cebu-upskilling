// Shared form-error helpers for the auth pages (Requirements 19.5, 19.6, 19.8).

export const RATE_LIMIT_TEXT = 'Too many attempts, try again in a minute';
export const GENERIC_REQUEST_ERROR = "We couldn't process that request. Please check your details and try again.";

// Messages the API client synthesises when the server body has no usable `error`.
const SYNTHETIC_MESSAGE = /^(HTTP \d{3}|Request failed — please try again|\[object Object\])$/;

/**
 * Text for the form summary from a rejected API call.
 * - 429: the fixed rate-limit text.
 * - 400: the server `error` string; a missing, empty or non-string value gives the generic message.
 * - anything else: the error message, or `fallback`.
 */
export function summarizeError(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.status === 429) return RATE_LIMIT_TEXT;
  const raw = err?.message;
  const usable = typeof raw === 'string' && raw.trim() !== '' && !SYNTHETIC_MESSAGE.test(raw.trim());
  if (err?.status === 400) return usable ? raw : GENERIC_REQUEST_ERROR;
  return usable ? raw : fallback;
}
