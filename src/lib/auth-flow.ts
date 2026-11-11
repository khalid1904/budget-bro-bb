export const MIN_PASSWORD_LENGTH = 6;
export const SIGNUP_SUCCESS_PATH = '/login';
export const PUBLIC_APP_URL = 'https://budget-bro-bb.vercel.app';

// Email links must open the public site, including links requested from
// native WebViews, old Lovable builds, and deployment previews.
export function getAuthRedirectOrigin(origin: string, development = import.meta.env.DEV): string {
  if (development) {
    try {
      const url = new URL(origin);
      if (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        return url.origin;
      }
    } catch { /* Fall back to the public site for non-web origins. */ }
  }
  return PUBLIC_APP_URL;
}

export function isPasswordValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function passwordsMatch(password: string, confirmation: string): boolean {
  return password === confirmation;
}

export function getRecoveryRedirectUrl(origin: string, development = import.meta.env.DEV): string {
  return `${getAuthRedirectOrigin(origin, development)}/reset-password`;
}

export function isRecoveryLinkHash(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, '')).get('type') === 'recovery';
}

type AuthOperationResult = { error: { message: string } | null };

export async function updatePasswordThenSignOut(
  updatePassword: () => Promise<AuthOperationResult>,
  signOut: () => Promise<AuthOperationResult>,
): Promise<{ message: string } | null> {
  const updateResult = await updatePassword();
  if (updateResult.error) return updateResult.error;

  const signOutResult = await signOut();
  return signOutResult.error;
}