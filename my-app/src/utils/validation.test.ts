import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidLebanesePhone,
  isOver18,
  isValidPassword,
  getPasswordErrorMessage,
} from './validation';

describe('isValidEmail', () => {
  it.each([
    ['a@b.com', true],
    ['user.name@example.co.uk', true],
    ['no-at-sign', false],
    ['missing@domain', false],
    ['spaces in@email.com', false],
    ['', false],
  ])('%s -> %s', (input, expected) => {
    expect(isValidEmail(input)).toBe(expected);
  });
});

describe('isValidLebanesePhone', () => {
  it.each([
    ['71123456', true], // bare 8 digits
    ['071123456', true], // 0 prefix + 8 digits
    ['+96171123456', true],
    ['96171123456', true],
    ['123', false],
    ['notaphone', false],
  ])('%s -> %s', (input, expected) => {
    expect(isValidLebanesePhone(input)).toBe(expected);
  });
});

describe('isOver18', () => {
  it('accepts a clearly adult date', () => {
    expect(isOver18('1990-01-01')).toBe(true);
  });
  it('rejects a clearly underage date', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    expect(isOver18(fiveYearsAgo.toISOString().slice(0, 10))).toBe(false);
  });
  it('rejects exactly-not-yet-18 (birthday tomorrow)', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setDate(d.getDate() + 1);
    expect(isOver18(d.toISOString().slice(0, 10))).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts a strong password', () => {
    expect(isValidPassword('Abcdef1!')).toBe(true);
  });
  it.each([
    ['short', 'Ab1!'],
    ['no upper', 'abcdef1!'],
    ['no lower', 'ABCDEF1!'],
    ['no number', 'Abcdefg!'],
    ['no special', 'Abcdef12'],
  ])('rejects: %s', (_label, pw) => {
    expect(isValidPassword(pw)).toBe(false);
  });
});

describe('getPasswordErrorMessage', () => {
  it('returns empty string for a valid password', () => {
    expect(getPasswordErrorMessage('Abcdef1!')).toBe('');
  });
  it('explains the first failing rule', () => {
    expect(getPasswordErrorMessage('short')).toMatch(/at least 8 characters/i);
    expect(getPasswordErrorMessage('abcdef1!')).toMatch(/uppercase/i);
  });
});
