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