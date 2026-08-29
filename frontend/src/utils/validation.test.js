import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateMaxLength,
  validateMinLength,
  validateBirthday,
  validatePasswordConfirm,
  validateHttpUrl,
  validateJobType,
  validateExperienceLevel,
  validateEmployerApplicationStatus,
  validateLearnerApplicationStatus,
  validatePrice,
  validateTechnicalLevel,
  validateProgressPercent,
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

describe('validateHttpUrl', () => {
  it('treats an empty value as optional', () => {
    expect(validateHttpUrl('')).toBeUndefined();
    expect(validateHttpUrl(null)).toBeUndefined();
  });

  it('requires a value when { required: true }', () => {
    expect(validateHttpUrl('', { required: true })).toMatch(/required/);
  });

  it('accepts http and https URLs', () => {
    expect(validateHttpUrl('https://acme.com/logo.png')).toBeUndefined();
    expect(validateHttpUrl('http://acme.com/x')).toBeUndefined();
  });

  it('rejects non-http schemes', () => {
    expect(validateHttpUrl('javascript:alert(1)')).toMatch(/http/);
    expect(validateHttpUrl('ftp://example.com/x')).toMatch(/http/);
    expect(validateHttpUrl('data:text/html,<script>alert(1)</script>')).toMatch(/http/);
  });

  it('rejects garbage', () => {
    expect(validateHttpUrl('not-a-url')).toMatch(/http/);
  });

  it('rejects URLs longer than 2048 characters', () => {
    const long = 'https://acme.com/' + 'a'.repeat(2050);
    expect(validateHttpUrl(long)).toMatch(/exceed/);
  });
});

describe('validateJobType', () => {
  it('accepts an empty value', () => {
    expect(validateJobType('')).toBeUndefined();
    expect(validateJobType(null)).toBeUndefined();
  });

  it('accepts the allowlist', () => {
    for (const t of ['Full-time', 'Part-time', 'Contract', 'Side-hustle']) {
      expect(validateJobType(t)).toBeUndefined();
    }
  });

  it('rejects unknown values', () => {
    expect(validateJobType('HackerTime')).toMatch(/Job type/);
  });
});

describe('validateExperienceLevel', () => {
  it('accepts an empty value (means "any")', () => {
    expect(validateExperienceLevel('')).toBeUndefined();
  });

  it('accepts the allowlist', () => {
    for (const l of ['Entry', 'Junior', 'Mid', 'Senior', 'Lead']) {
      expect(validateExperienceLevel(l)).toBeUndefined();
    }
  });

  it('rejects unknown levels', () => {
    expect(validateExperienceLevel('Principal')).toMatch(/Experience level/);
  });
});

describe('validateEmployerApplicationStatus', () => {
  it('requires a value', () => {
    expect(validateEmployerApplicationStatus('')).toMatch(/required/);
    expect(validateEmployerApplicationStatus(null)).toMatch(/required/);
  });

  it('accepts the allowlist', () => {
    for (const s of ['applied', 'reviewing', 'interview', 'rejected', 'hired']) {
      expect(validateEmployerApplicationStatus(s)).toBeUndefined();
    }
  });

  it('rejects arbitrary values (including SQL-flavored)', () => {
    expect(validateEmployerApplicationStatus('banana')).toMatch(/must be one of/);
    expect(validateEmployerApplicationStatus("' OR 1=1; --")).toMatch(/must be one of/);
  });
});

describe('validateLearnerApplicationStatus', () => {
  it('requires a value', () => {
    expect(validateLearnerApplicationStatus('')).toMatch(/required/);
  });

  it('accepts the learner allowlist', () => {
    for (const s of ['applied', 'saved', 'withdrawn']) {
      expect(validateLearnerApplicationStatus(s)).toBeUndefined();
    }
  });

  it('rejects recruiter-only statuses (server-enforced but client should filter)', () => {
    expect(validateLearnerApplicationStatus('hired')).toMatch(/must be one of/);
  });
});

describe('validatePrice', () => {
  it('treats empty as optional', () => {
    expect(validatePrice('')).toBeUndefined();
    expect(validatePrice(null)).toBeUndefined();
  });

  it('accepts non-negative numbers', () => {
    expect(validatePrice(0)).toBeUndefined();
    expect(validatePrice(99.99)).toBeUndefined();
  });

  it('rejects negatives', () => {
    expect(validatePrice(-1)).toMatch(/negative/);
  });

  it('rejects absurdly large values', () => {
    expect(validatePrice(1_000_001)).toMatch(/exceed/);
  });

  it('rejects non-numeric strings', () => {
    expect(validatePrice('abc')).toMatch(/number/);
  });
});

describe('validateTechnicalLevel', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i', (n) => {
    expect(validateTechnicalLevel(n)).toBeUndefined();
  });

  it.each([0, 6, -1, 1.5, 'x'])('rejects %s', (v) => {
    expect(validateTechnicalLevel(v)).toMatch(/between 1 and 5/);
  });
});

describe('validateProgressPercent', () => {
  it.each([0, 25, 50, 99.5, 100])('accepts %s', (v) => {
    expect(validateProgressPercent(v)).toBeUndefined();
  });

  it.each([-1, 101, 200, 'x'])('rejects %s', (v) => {
    expect(validateProgressPercent(v)).toMatch(/between 0 and 100/);
  });
});
