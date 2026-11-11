/**
 * Password strength for the ResetPasswordPage meter (Requirement 4.8).
 * Returns exactly one of "Weak" | "Fair" | "Good" | "Strong" plus a 1-4 level,
 * or `null` for an empty password.
 */
export const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

export function getPasswordStrength(password) {
  if (typeof password !== 'string' || password.length === 0) return null;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const points =
    (password.length >= 8 ? 1 : 0) +
    (password.length >= 12 ? 1 : 0) +
    (classes >= 2 ? 1 : 0) +
    (classes >= 3 ? 1 : 0) +
    (classes >= 4 ? 1 : 0);
  let level = 1;
  if (password.length >= 6) {
    if (points >= 5) level = 4;
    else if (points >= 3) level = 3;
    else if (points >= 2) level = 2;
  }
  return { level, label: STRENGTH_LABELS[level - 1] };
}
