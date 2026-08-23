import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateMaxLength,
  validateMinLength,
  validateBirthday,
  validatePasswordConfirm,
} from './validation';

describe('validateEmail', () => {
  it('requires a value', () => {
    expect(validateEmail('')).toBe('Email address is required');
    expect(validateEmail('   ')).toBe('Email address is required');
    expect(validateEmail(undefined)).toBe('Email address is required');
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('not-an-email')).toBe('Please enter a valid email address');
    expect(validateEmail('a@b')).toBe('Please enter a valid email address');
    expect(validateEmail('a b@c.com')).toBe('Please enter a valid email address');
  });

  it('accepts a valid address', () => {
    expect(validateEmail('jose@example.com')).toBeUndefined();
    expect(validateEmail('  jose@example.com  ')).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('requires a value', () => {
    expect(validatePassword('')).toBe('Password is required');
    expect(validatePassword(undefined)).toBe('Password is required');
  });

  it('enforces the minimum length', () => {
    expect(validatePassword('abc')).toBe('Password must be at least 6 characters');
    expect(validatePassword('abcdef')).toBeUndefined();
  });

  it('enforces the maximum length', () => {
    expect(validatePassword('a'.repeat(101))).toBe('Password must not exceed 100 characters');
    expect(validatePassword('a'.repeat(100))).toBeUndefined();
  });
});

describe('validateRequired', () => {
  it('returns an error containing the label when empty', () => {
    expect(validateRequired('', 'First name')).toBe('First name is required');
    expect(validateRequired('   ', 'Email')).toBe('Email is required');
    expect(validateRequired(null, 'Email')).toBe('Email is required');
    expect(validateRequired(undefined, 'Email')).toBe('Email is required');
  });

  it('returns no error for a provided value', () => {
    expect(validateRequired('Jose', 'First name')).toBeUndefined();
    expect(validateRequired('  0  ', 'Number')).toBeUndefined();
  });

  it('treats falsy values as missing', () => {
    expect(validateRequired(0, 'Number')).toBe('Number is required');
    expect(validateRequired(false, 'Flag')).toBe('Flag is required');
  });
});

describe('validateMaxLength', () => {
  it('returns an error when the value is too long', () => {
    expect(validateMaxLength('abcdef', 5, 'Company name')).toBe(
      'Company name must not exceed 5 characters',
    );
  });

  it('returns no error within the limit or for empty values', () => {
    expect(validateMaxLength('abc', 5, 'Company name')).toBeUndefined();
    expect(validateMaxLength('', 5, 'Company name')).toBeUndefined();
    expect(validateMaxLength(null, 5, 'Company name')).toBeUndefined();
  });
});

describe('validateMinLength', () => {
  it('returns an error when the value is too short', () => {
    expect(validateMinLength('ab', 3, 'Password')).toBe(
      'Password must be at least 3 characters',
    );
  });

  it('returns no error when long enough or empty', () => {
    expect(validateMinLength('abcd', 3, 'Password')).toBeUndefined();
    expect(validateMinLength('', 3, 'Password')).toBeUndefined();
  });
});

describe('validateBirthday', () => {
  it('accepts an empty value', () => {
    expect(validateBirthday('')).toBeUndefined();
    expect(validateBirthday(undefined)).toBeUndefined();
  });

  it('rejects an unparseable date', () => {
    expect(validateBirthday('next tuesday')).toBe('Please enter a valid date');
  });

  it('rejects a future date', () => {
    const future = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(validateBirthday(future)).toBe('Birthday must be in the past');
  });

  it('accepts a past date', () => {
    expect(validateBirthday('1990-01-01')).toBeUndefined();
  });
});

describe('validatePasswordConfirm', () => {
  it('requires a value', () => {
    expect(validatePasswordConfirm('', 'secret123')).toBe('Confirm password is required');
    expect(validatePasswordConfirm(undefined, 'secret123')).toBe('Confirm password is required');
  });

  it('rejects mismatched passwords', () => {
    expect(validatePasswordConfirm('secret124', 'secret123')).toBe('Passwords do not match');
    expect(validatePasswordConfirm('secret123 ', 'secret123')).toBe('Passwords do not match');
  });

  it('accepts matching passwords', () => {
    expect(validatePasswordConfirm('secret123', 'secret123')).toBeUndefined();
  });
});
