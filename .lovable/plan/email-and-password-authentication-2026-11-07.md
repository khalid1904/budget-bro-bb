# Email and password authentication

Replace the current email-code sign-in with email/password registration and sign-in, matching the uploaded requirements.

## User experience
- `/register`: collect email, password, and confirmation; support show/hide controls and a six-character minimum. Create the account without a verification email, then sign out and return to `/login` with a success notice.
- `/login`: email/password form, clear credential errors, link to registration, and a forgot-password flow that sends a recovery link to `/reset-password`.
- `/reset-password`: public recovery page that accepts only a valid recovery session, collects and confirms a new password, saves it, signs out, and returns to `/login` with the requested success notice. It must not route through the signed-in redirect that would send a recovery session to the dashboard.
- Remove email-code controls and Google sign-in from the authentication experience. Preserve existing profile setup and all post-login features.

## Technical approach
- Update the existing login and registration pages, add the password-reset page and route, and preserve the existing profile initialization and profile fields.
- Configure email/password authentication with automatic email confirmation as explicitly requested, and disable the Google provider while retaining the other existing sign-in settings.
- Use the app origin plus `/reset-password` for recovery redirects; validate the recovery link before allowing a password change, then explicitly sign out.
- Add focused checks for password validation, signup routing, recovery-link handling, and post-reset sign-out. Verify the public auth screens and reset flow where the available preview session permits.
