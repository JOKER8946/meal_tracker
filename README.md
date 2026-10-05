# Daily

**Live app:** [daily-meal-tracker-livid.vercel.app](https://daily-meal-tracker-livid.vercel.app)
· **Source:** [JOKER8946/meal_tracker](https://github.com/JOKER8946/meal_tracker)

Mobile-first diet and sleep tracker being built in the requested feature order:
Supabase schema/RLS → auth → compressed meal uploads → sleep → calendar/history
→ weekly charts → PWA → maximalist styling → Vercel deployment.

**Current state:** Features 1–9 are implemented and deployed on Vercel. The schema passed 5 local
PostgreSQL tests and 94 live API checks with two ordinary accounts. Individual
browser checks passed for auth, compressed meal uploads, sleep, calendar/history,
weekly data, the production PWA, and responsive layouts. All **8 combined production
browser tests** also passed against real Supabase, both locally and on the live
Vercel URL. GitHub is connected for automatic deployments. Real signup email delivery/confirmation and
installation on your physical phone still need acceptance checks. This is not a
claim that the full DONE checklist has passed.

## Run Daily locally

Use Node.js **24.x**, then:

```powershell
npm install
npm run dev
```

Open [Daily locally](http://localhost:3000). Use your Supabase email and password.
Use **Create account** to register, then follow the confirmation email. Your app's
URL must be allowed in Supabase as described below. Existing confirmed accounts
can sign in immediately.

For the production PWA, use `npm run build`, then `npm run start -- --port 3001`
and open [the production preview](http://localhost:3001). The service worker only
registers in production. A service worker can be tested on localhost; physical
phones need the HTTPS deployment for installation.

## Full code, by feature

All listed files contain the complete implementation, not pseudocode or snippets.

| Feature | Source files |
| --- | --- |
| 1. Schema and RLS | [SQL migration](supabase/migrations/202610050001_tracker.sql), [SQL tests](tests/schema.test.mjs), [live isolation test](scripts/verify-rls.mjs) |
| 2. Auth | [auth UI](src/components/auth.tsx), [session lifecycle](src/components/app.tsx), [public Supabase client](src/lib/supabase.ts) |
| 3. Meals | [meal editor](src/components/meal-editor.tsx), [compression and photo cleanup](src/lib/photos.ts), [private photo cards](src/components/meal-card.tsx) |
| 4. Sleep | [sleep editor](src/components/sleep-editor.tsx), [date/duration helpers](src/lib/dates.ts), [journal CRUD](src/components/journal.tsx) |
| 5. History | [calendar](src/components/calendar.tsx), [journal](src/components/journal.tsx), [paginated reads](src/lib/read-rows.ts) |
| 6. Charts | [Recharts views](src/components/weekly-charts.tsx), [aggregation](src/lib/weekly.ts) |
| 7. PWA | [manifest](src/app/manifest.ts), [worker](public/sw.js), [install controls](src/components/pwa.tsx), [offline page](public/offline.html), [icon generator](scripts/generate-icons.mjs) |
| 8. Design | [Tailwind/global styles](src/app/globals.css), [layout and fonts](src/app/layout.tsx), [animated cards](src/components/meal-card.tsx) |
| 9. Deployment | [Vercel config](vercel.json), [Next config](next.config.ts), [public-key build check](scripts/check-public-config.mjs), [secret scan](scripts/audit-secrets.mjs), [.vercelignore](.vercelignore) |

Shared files: [types](src/lib/types.ts), [accessible native dialog](src/components/modal.tsx),
[App Router page](src/app/page.tsx), [package scripts](package.json),
[browser test configuration](playwright.config.ts).

## Feature 1 — full source

- [`supabase/migrations/202610050001_tracker.sql`](supabase/migrations/202610050001_tracker.sql): complete copy-paste schema, RLS, private bucket, and Storage policies.
- [`tests/schema.test.mjs`](tests/schema.test.mjs): executable PostgreSQL checks using PGlite and simulated Supabase identities.
- [`scripts/verify-rls.mjs`](scripts/verify-rls.mjs): real Supabase integration checks with two ordinary accounts; no service-role key.
- [`.env.example`](.env.example): public configuration and optional local test-account variables.

## Exactly what to click in Supabase

1. In [Supabase Dashboard](https://supabase.com/dashboard/project/xfcndikjssiwsbgrohmv),
   open your existing project. The app name is **Daily**. Keep database passwords
   in your password manager, never in source files or chat. If this project already
   has tracker tables or Storage policies, inspect them before running the migration;
   additional permissive policies can defeat user isolation.
2. Open **SQL Editor → New query**. Paste the **entire contents** of
   `supabase/migrations/202610050001_tracker.sql`, then click **Run**.
   Run it once. If it fails, its transaction rolls back; resolve the reported error
   before retrying. Do not remove tables or policies to silence an error.
3. In **Table Editor**, confirm `meals` and `sleep_logs` exist and RLS is enabled.
   In **Storage**, confirm `meal-photos` exists and is **private**.
4. Open the project's **Connect** dialog (or **Project Settings → API / API Keys**).
   Copy the project URL and **anon/public** key. Never use `service_role` or a secret
   API key in this app. Dashboard labels may differ slightly by dashboard version.
5. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `.env.local` is ignored by Git.
6. Under **Authentication → Sign In / Providers → Email**, enable email/password.
   Leave email confirmation enabled for production. The app provides signup,
   login, password reset, and a new-password form for recovery links.
7. For integration testing, use **Authentication → Users → Add user → Create new user**
   to create **two distinct dedicated test accounts** with confirmed emails.
   Add their emails and passwords to the `TEST_USER_A_*` and `TEST_USER_B_*` entries
   in your local `.env.local`. Do not send these passwords in chat or commit them.
8. Run `npm install`, `npm run test:schema`, and `npm run test:rls`.
   The last command accesses your project and temporarily creates records and
   images under the test users; it removes its fixtures in a `finally` block.
   A network outage can interrupt cleanup. Never use real personal accounts here.

The local test validates the actual SQL in PostgreSQL, including anonymous access,
both directions of cross-user reads/writes/deletes, forged owners, Storage path
ownership, overnight duration, daylight-saving offsets, and invalid values.
It uses small stand-ins for Supabase's `auth` and `storage` schemas and **does not
prove** real Auth, Storage service behavior, or project configuration. The live
test verifies these policies through real authenticated HTTP requests. Both are
needed; browser tests separately exercise the UI.

## Data conventions

- Each meal requires a photo path, type, timestamp, and calendar date; notes may
  be empty and are limited to 5,000 characters. Accepted tags: breakfast, lunch,
  dinner, snack. The image path is `<auth-user-uuid>/<random-uuid>.webp` (or `.jpg`).
- `meal_date` preserves the day selected by the user; timestamps store the actual
  instant. The UI must send these consistently in the user's local timezone.
- Sleep is assigned to the wake-up date, with one night per user per day.
  Full timestamps handle midnight and timezone offsets. PostgreSQL calculates
  `duration_minutes`; clients cannot forge it. Duration must be >0 and ≤24 hours.
- Images are private and limited to 200,000 bytes and WebP/JPEG MIME types. The
  upload feature compresses **before** upload and enforces 1,280px.
  Storage's byte/MIME limits do not check decoded pixel dimensions.
- User IDs default to the authenticated ID. RLS applies to all four data actions
  and checks both existing and resulting ownership on updates.
- Deleting an Auth user cascades its rows, but Storage files must be removed via
  the Storage API first. Do not delete Storage metadata with SQL.

## GitHub and Vercel

The existing Git remote is `https://github.com/JOKER8946/meal_tracker.git`.
Deployment status is recorded in [AUDIT.md](AUDIT.md). Keep test-account
credentials local; they do not belong in Vercel. Never deploy `.env.local`.

### Exactly what to click in Vercel

1. Sign in at [Vercel](https://vercel.com/new). Choose **Add New → Project**.
2. Connect GitHub if prompted. Import **JOKER8946/meal_tracker**. If it is missing,
   use **Adjust GitHub App Permissions** to grant access to this repository.
3. Name the project `daily-meal-tracker` (or an available name). Select the
   **Next.js** framework preset and leave the root directory as `./`.
4. Under build settings, use `npm run build`, `npm ci` for installation, and the
   default Next.js output directory. Select **Node.js 24.x** if it isn't selected.
5. Expand **Environment Variables** and add only:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | The project URL from your local `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon/public key from your local `.env.local` |

   Enable these values for Production and Preview (and Development if desired).
   Do **not** add `TEST_USER_*`, database passwords, secret keys, or service-role keys.
6. Click **Deploy**. Wait for **Ready**, then open the production HTTPS URL.
   If environment variables change later, create a fresh deployment; Next.js
   embeds `NEXT_PUBLIC_*` values at build time.
7. Complete the Supabase URL configuration below before testing signup or password
   reset. A successful deployment alone does not prove confirmation redirects work.

### Supabase URL configuration after deployment

1. Open your project's **Authentication → URL Configuration**.
2. Set **Site URL** to the exact production URL, for example
   `https://daily-meal-tracker-livid.vercel.app` (the deployed production URL).
3. Under **Redirect URLs**, click **Add URL** and add your production origin,
   `http://localhost:3000`, and `http://localhost:3001` for local testing.
   The app sends `window.location.origin` as the signup/recovery redirect.
   Add a specific preview origin only when you intend to test email flows there.
4. Click **Save changes**. Keep the default confirmation email's
   `{{ .ConfirmationURL }}` link unless you intentionally customize email templates.
5. Create a new account through **Daily → Create account**, open the confirmation
   email, and confirm that it returns to Daily and permits login. Also test a
   password-reset email. Dashboard-created confirmed accounts do not verify this flow.
   If Supabase's default mail service refuses recipients or rate-limits delivery,
   configure your own SMTP provider under **Authentication → Email / SMTP settings**.
6. After the intended 2–3 people register, you may disable new signups in Supabase
   if you want to keep the app limited to those accounts. Existing users can still
   sign in; RLS remains the privacy boundary.

### Install on a phone

- Android Chrome: open the HTTPS production URL, sign in, tap **Install Daily**
  or **⋮ → Install app / Add to Home screen**.
- iPhone Safari: open the HTTPS production URL, then **Share → Add to Home Screen**.
- Open the installed icon and confirm the app opens without browser chrome.
- Camera and gallery pickers are separate. HEIC-only files need conversion to
  JPEG first; unsupported files show a readable error instead of uploading.
- Data editing requires internet access. When opened offline, Daily shows a
  reconnection page. It does not claim to queue offline writes or store a private
  journal in the service-worker cache.

## Verification commands

```powershell
npm run test:schema
npm run test:unit
npm run typecheck
npm run build
npm run audit:secrets
npm run test:rls
# Run a production server in another terminal first:
npm run start -- --port 3001
# Then, in the test terminal:
$env:TEST_BASE_URL='http://localhost:3001'
npm run test:e2e
```

Browser tests use installed Google Chrome and the two dedicated accounts from
`.env.local`. Tests write temporary future-dated entries and delete them. Use
dedicated accounts and don't edit their fixtures while tests run. A terminated
process or network outage can interrupt cleanup; inspect the test account before
rerunning. Trace/video capture is disabled to avoid storing login credentials.
Playwright error snapshots may still contain typed values; `test-results/` is
ignored by Git and Vercel and must not be shared without redaction.

Private images are downloaded under the user's JWT and displayed with temporary
blob URLs, revoked when cards unmount. Failed Storage cleanup is retried on the
same device; only owned object paths are kept in a local cleanup queue. The app
does not cache personal rows, image data, or signed URLs in the service worker.

Official setup references: [Vercel project import](https://vercel.com/docs/projects/deploy-from-cli),
[environment variables](https://vercel.com/docs/cli/env), and
[Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Acceptance checklist

- [ ] Real email/password signup and login; two-account isolation verified
- [x] Gallery photo compressed to ≤1,280px and <200 KB before upload; camera input provided (physical-phone check pending)
- [x] Meal photo, notes, type, date/time
- [x] Overnight sleep logging with automatic duration
- [x] Weekly sleep and meals-by-type charts
- [x] Calendar/day history, photos, edit and delete
- [ ] Valid PWA, phone installation, small-screen usability
- [x] Bold, layered, readable maximalist design with restrained motion (user acceptance pending)
- [x] Copy-paste SQL schema, RLS policies, Storage bucket policies provided
- [x] Live Vercel deployment with environment variables; complete setup guide
- [x] Final secrets scan; public Supabase key only in client bundle
- [x] Automated outer-loop audit against two accounts and mobile layout
- [ ] Production signup email confirmation and password-reset delivery verified by mailbox owner
- [ ] User confirms deployed app on their phone

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
