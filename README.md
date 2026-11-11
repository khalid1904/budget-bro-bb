# Budget Bro

Budget Bro is a React app that runs on the web and in a Capacitor Android app. Android keeps the existing features and adds native receipt image/PDF sharing from other apps.

## Production hosting and authentication

The public app is https://budget-bro-bb.vercel.app. Vercel deploys the connected
GitHub repository. `vercel.json` serves React routes such as `/reset-password`
and `/dashboard` on direct visits and refreshes.

Email redirects use `PUBLIC_APP_URL` in `src/lib/auth-flow.ts`, including when
requested from Android or previews. Local HTTP development uses its own origin.
The Supabase project remains the existing Lovable-connected backend.

Before using email authentication on Vercel, update the **hosted** Supabase
Authentication → URL Configuration (or the equivalent Lovable-managed auth settings):

- Site URL: `https://budget-bro-bb.vercel.app`
- Allowed redirect URLs:
  - `https://budget-bro-bb.vercel.app`
  - `https://budget-bro-bb.vercel.app/login`
  - `https://budget-bro-bb.vercel.app/reset-password`
- For local development only, also allow `http://localhost:8080/**` if needed.

Check the confirmation and password-recovery email templates for hardcoded
Lovable links. Their action links should use `{{ .ConfirmationURL }}` so Supabase
verifies the token before redirecting to the requested page. Do not replace the
action link with just the app URL. These hosted settings are not changed by a
Git push or by editing `supabase/config.toml`.

After publishing and updating those settings, request a **new** password reset
email and verify it opens `/reset-password` on Vercel, saves the password, and
returns to `/login`. Existing emails retain their original destinations.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
and [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Android app

Android builds require Node.js/npm, a compatible Java Development Kit, and the Android SDK. To prepare and open the project:

```sh
npm install
npm run android:sync
npm run android:open
```

Use Android Studio to run on a device/emulator or build and sign an APK/AAB. Test receipt sharing from payment apps on an Android device. This workspace does not include Java or the Android SDK, so an APK cannot be built here.

For development-only live reload, set `CAPACITOR_LIVE_RELOAD=true` before running `npm run android:sync:live`. Do not use live reload in release builds.

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
