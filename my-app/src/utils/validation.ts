/**
 * Shared form validators. Previously duplicated verbatim in SignupPage and
 * CustomerSignupPage — kept here as the single source of truth.
 */

// At least one of each char class is required; the special-char class is written
// without the redundant escapes that tripped no-useless-escape.
const SPECIAL_CHAR = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidLebanesePhone = (phone: string): boolean => {
  // +961XXXXXXXXX | 961XXXXXXXXX | 0XXXXXXXXX | XXXXXXXX
  const phoneRegex = /^(\+961|961|0)?[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isOver18 = (dateOfBirth: string): boolean => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

export const isValidPassword = (password: string): boolean =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  SPECIAL_CHAR.test(password);

/** Human-readable reason a password fails {@link isValidPassword}, or '' if valid. */
export const getPasswordErrorMessage = (password: string): string => {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter (A-Z)';
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter (a-z)';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number (0-9)';
  if (!SPECIAL_CHAR.test(password)) return 'Password must contain at least 1 special character (!@#$%^&* etc.)';
  return '';
};
