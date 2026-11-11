import { describe, expect, it, vi } from 'vitest';
import {
  getRecoveryRedirectUrl,
  getAuthRedirectOrigin,
  isPasswordValid,
  isRecoveryLinkHash,
  passwordsMatch,
  SIGNUP_SUCCESS_PATH,
  updatePasswordThenSignOut,
} from '@/lib/auth-flow';

describe('authentication flow rules', () => {
  it('requires at least six characters for passwords', () => {
    expect(isPasswordValid('12345')).toBe(false);
    expect(isPasswordValid('123456')).toBe(true);
  });

  it('requires the password confirmation to match', () => {
    expect(passwordsMatch('budget1', 'budget1')).toBe(true);
    expect(passwordsMatch('budget1', 'budget2')).toBe(false);
  });

  it('returns newly registered users to login', () => {
    expect(SIGNUP_SUCCESS_PATH).toBe('/login');
  });

  it('sends recovery links to the reset-password page', () => {
    expect(getRecoveryRedirectUrl('https://budget-bro-bb.lovable.app'))
      .toBe('https://budget-bro-bb.vercel.app/reset-password');
  });

  it.each([
    'https://budget-bro-bb.vercel.app',
    'https://budget-bro-bb.lovable.app',
    'https://preview.lovableproject.com',
    'https://budget-bro-preview.vercel.app',
    'https://localhost',
    'capacitor://localhost',
    'http://localhost',
  ])('uses the public Vercel site for production emails from %s', origin => {
    expect(getAuthRedirectOrigin(origin, false)).toBe('https://budget-bro-bb.vercel.app');
    expect(getRecoveryRedirectUrl(origin, false)).toBe('https://budget-bro-bb.vercel.app/reset-password');
  });

  it('keeps local development email redirects on the local server', () => {
    expect(getRecoveryRedirectUrl('http://localhost:8080', true)).toBe('http://localhost:8080/reset-password');
    expect(getAuthRedirectOrigin('http://127.0.0.1:8080', true)).toBe('http://127.0.0.1:8080');
  });

  it('recognizes a recovery link only when its hash says recovery', () => {
    expect(isRecoveryLinkHash('#access_token=sample&type=recovery')).toBe(true);
    expect(isRecoveryLinkHash('#access_token=sample&type=signup')).toBe(false);
  });

  it('signs out only after the password has been updated successfully', async () => {
    const calls: string[] = [];
    const updatePassword = vi.fn(async () => {
      calls.push('update');
      return { error: null };
    });
    const signOut = vi.fn(async () => {
      calls.push('signout');
      return { error: null };
    });

    expect(await updatePasswordThenSignOut(updatePassword, signOut)).toBeNull();
    expect(calls).toEqual(['update', 'signout']);
  });

  it('does not sign out when the password update fails', async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const error = { message: 'Update failed' };

    expect(await updatePasswordThenSignOut(async () => ({ error }), signOut)).toBe(error);
    expect(signOut).not.toHaveBeenCalled();
  });
});