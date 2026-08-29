export function validateEmail(value) {
  if (!value || !value.trim()) {
    return 'Email address is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

export function validatePassword(value) {
  if (!value) {
    return 'Password is required';
  }
  if (value.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (value.length > 100) {
    return 'Password must not exceed 100 characters';
  }
  return undefined;
}

export function validatePasswordConfirm(confirmValue, passwordValue) {
  if (!confirmValue) {
    return 'Confirm password is required';
  }
  if (confirmValue !== passwordValue) {
    return 'Passwords do not match';
  }
  return undefined;
}

export function validateRequired(value, label) {
  if (!value || !value.toString().trim()) {
    return `${label} is required`;
  }
  return undefined;
}

export function validateMaxLength(value, max, label) {
  if (value && value.length > max) {
    return `${label} must not exceed ${max} characters`;
  }
  return undefined;
}

export function validateMinLength(value, min, label) {
  if (value && value.length < min) {
    return `${label} must be at least ${min} characters`;
  }
  return undefined;
}

export function validateBirthday(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Please enter a valid date';
  }
  if (date > new Date()) {
    return 'Birthday must be in the past';
  }
  return undefined;
}

export function validateHttpUrl(value, { required = false } = {}) {
  if (!value || !value.trim()) {
    return required ? 'URL is required' : undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > 2048) {
    return 'URL must not exceed 2048 characters';
  }
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return 'URL must start with http:// or https://';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'URL must start with http:// or https://';
  }
  return undefined;
}

const ALLOWED_JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Side-hustle'];
const ALLOWED_EXPERIENCE_LEVELS = ['', 'Entry', 'Junior', 'Mid', 'Senior', 'Lead'];
const ALLOWED_EMPLOYER_STATUSES = [
  'applied', 'saved', 'withdrawn', 'reviewing', 'interview', 'rejected', 'hired',
];
const ALLOWED_LEARNER_STATUSES = ['applied', 'saved', 'withdrawn'];

export function validateJobType(value) {
  if (value == null || value === '') return undefined;
  return ALLOWED_JOB_TYPES.includes(value)
    ? undefined
    : `Job type must be one of: ${ALLOWED_JOB_TYPES.join(', ')}`;
}

export function validateExperienceLevel(value) {
  if (value == null || value === '') return undefined;
  return ALLOWED_EXPERIENCE_LEVELS.includes(value)
    ? undefined
    : `Experience level must be one of: ${ALLOWED_EXPERIENCE_LEVELS.filter(Boolean).join(', ')}`;
}

export function validateEmployerApplicationStatus(value) {
  if (!value) return 'Status is required';
  return ALLOWED_EMPLOYER_STATUSES.includes(value)
    ? undefined
    : `Status must be one of: ${ALLOWED_EMPLOYER_STATUSES.join(', ')}`;
}

export function validateLearnerApplicationStatus(value) {
  if (!value) return 'Status is required';
  return ALLOWED_LEARNER_STATUSES.includes(value)
    ? undefined
    : `Status must be one of: ${ALLOWED_LEARNER_STATUSES.join(', ')}`;
}

export function validatePrice(value) {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Price must be a number';
  if (n < 0) return 'Price must not be negative';
  if (n > 1_000_000) return 'Price must not exceed 1000000';
  return undefined;
}

export function validateTechnicalLevel(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    return 'Technical level must be between 1 and 5';
  }
  return undefined;
}

export function validateProgressPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return 'Progress must be between 0 and 100';
  }
  return undefined;
}