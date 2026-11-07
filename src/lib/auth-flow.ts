export const MIN_PASSWORD_LENGTH = 6;
export const SIGNUP_SUCCESS_PATH = '/login';

export function isPasswordValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function passwordsMatch(password: string, confirmation: string): boolean {
  return password === confirmation;
}

export function getRecoveryRedirectUrl(origin: string): string {
  return `${origin}/reset-password`;
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