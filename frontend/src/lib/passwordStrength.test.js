import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getPasswordStrength, STRENGTH_LABELS } from './passwordStrength';
import { summarizeError, GENERIC_REQUEST_ERROR, RATE_LIMIT_TEXT } from './formErrors';

describe('getPasswordStrength', () => {
  it('returns null for an empty password', () => {
    expect(getPasswordStrength('')).toBeNull();
  });

  it('maps representative passwords to labels', () => {
    expect(getPasswordStrength('abc').label).toBe('Weak');
    expect(getPasswordStrength('abcdefgh1').label).toBe('Fair');
    expect(getPasswordStrength('Abcdefgh1').label).toBe('Good');
    expect(getPasswordStrength('Abcdefgh1!xyz').label).toBe('Strong');
  });

  it('always yields exactly one of the four labels for non-empty input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (pw) => {
        const s = getPasswordStrength(pw);
        expect(STRENGTH_LABELS).toContain(s.label);
        expect(s.level).toBe(STRENGTH_LABELS.indexOf(s.label) + 1);
      }),
      { numRuns: 100 },
    );
  });
});

describe('summarizeError', () => {
  it('uses the fixed text for 429', () => {
    expect(summarizeError({ status: 429, message: 'x' })).toBe(RATE_LIMIT_TEXT);
  });

  it('uses the server string for 400 and a generic message otherwise', () => {
    expect(summarizeError({ status: 400, message: 'Bad thing' })).toBe('Bad thing');
    expect(summarizeError({ status: 400, message: '' })).toBe(GENERIC_REQUEST_ERROR);
    expect(summarizeError({ status: 400, message: 'HTTP 400' })).toBe(GENERIC_REQUEST_ERROR);
    expect(summarizeError({ status: 400, message: undefined })).toBe(GENERIC_REQUEST_ERROR);
    expect(summarizeError({ status: 400, message: 42 })).toBe(GENERIC_REQUEST_ERROR);
  });
});
