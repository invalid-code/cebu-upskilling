import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateMaxLength,
  validateMinLength,
  validateBirthday,
  validatePasswordConfirm,
} from '../utils/validation';

const XSS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '\u0000\u0000\u0000',
  'eval("alert(1)")',
];

describe('Email validation — injection / hostile input', () => {
  it('rejects CRLF-injected addresses', () => {
    expect(validateEmail('a@b.com\r\nBcc: attacker@evil.com')).toMatch(/valid email/);
  });

  it('rejects header-injection attempts in the local part', () => {
    expect(validateEmail('a\r\nb@c.com')).toMatch(/valid email/);
  });

  it('rejects XSS payloads as email addresses', () => {
    for (const payload of XSS) {
      expect(validateEmail(payload)).toBe('Please enter a valid email address');
    }
  });

  it('accepts a normal address and trims surrounding whitespace', () => {
    expect(validateEmail('  jose@example.com  ')).toBeUndefined();
  });
});

describe('Password validation — DoS / hostile input', () => {
  it('rejects excessively long passwords (potential DoS on the server)', () => {
    expect(validatePassword('a'.repeat(101))).toMatch(/must not exceed 100/);
    expect(validatePassword('a'.repeat(100))).toBeUndefined();
  });

  it('does not crash on control characters (length check is the only gate)', () => {
    expect(validatePassword('\u0000\u0000\u0000\u0000\u0000\u0000')).toBeUndefined();
  });

  it('requires a minimum length to avoid trivially brute-forceable passwords', () => {
    expect(validatePassword('12345')).toMatch(/at least 6/);
    expect(validatePassword('123456')).toBeUndefined();
  });
});

describe('Required and length validators — hostile input', () => {
  it('treats whitespace-only values as missing for required fields', () => {
    expect(validateRequired('   ', 'Name')).toMatch(/required/);
  });

  it('validateMaxLength fires on XSS payloads that exceed the limit', () => {
    const longPayload = '<script>' + 'A'.repeat(5000) + '</script>';
    expect(validateMaxLength(longPayload, 100, 'Comment')).toMatch(/must not exceed 100/);
  });

  it('validateMaxLength tolerates values within the limit', () => {
    expect(validateMaxLength('hello', 100, 'Comment')).toBeUndefined();
  });

  it('validateMinLength is empty-safe (no spurious errors)', () => {
    expect(validateMinLength('', 3, 'Bio')).toBeUndefined();
    expect(validateMinLength(undefined, 3, 'Bio')).toBeUndefined();
  });
});

describe('Birthday validation — hostile input', () => {
  it('rejects obvious XSS as a date', () => {
    expect(validateBirthday('<script>alert(1)</script>')).toMatch(/valid date/);
  });

  it('rejects SQL-injection-flavored dates', () => {
    expect(validateBirthday("' OR 1=1; --")).toMatch(/valid date/);
  });
});

describe('Password confirm — hostile input', () => {
  it('treats typed-vs-typed mismatches as the source of truth (no normalization)', () => {
    expect(validatePasswordConfirm('secret123 ', 'secret123')).toMatch(/do not match/);
  });

  it('accepts byte-for-byte matches including XSS payload bytes', () => {
    const payload = '<script>alert(1)</script>123';
    expect(validatePasswordConfirm(payload, payload)).toBeUndefined();
  });
});
