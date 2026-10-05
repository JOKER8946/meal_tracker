# Daily acceptance audit

Live production: https://daily-meal-tracker-livid.vercel.app

Source: https://github.com/JOKER8946/meal_tracker

The goal remains open until the production deployment is verified and the user
confirms the app on their phone. A passed local check is not a deployed result.

| Requirement | Current evidence | Remaining verification |
| --- | --- | --- |
| Email/password auth, private users | Real login/logout/session browser tests; 94 live database/Storage checks with two accounts | Real signup email confirmation; production URL configuration |
| Photo compression before upload | Live-site browser inspected compressed preview: <200,000 bytes, ≤1,280px; downloaded Storage image matched | Camera/gallery behavior on user's phone |
| Meal fields and persistence | Production browser create/reload/edit/delete test; failed deletion shows an in-dialog error and retries | None for implemented flow |
| Sleep across midnight | SQL duration/DST tests; production browser overnight create/reload/edit/delete and invalid-time rejection | None for implemented flow |
| Calendar/history | Production date selection loads matching sleep; meal/day CRUD tested | None for implemented flow |
| Weekly charts | Aggregation unit test; production live sleep and meal-count table/chart agreement | None for implemented flow |
| PWA | Production manifest, icons, worker, cache boundary, offline page passed in Chrome | Physical phone installation |
| Maximalist mobile design | Rendered previews inspected; 320/390/768/1440px overflow and navigation tests passed; Framer Motion implemented | User visual acceptance |
| SQL/RLS/Storage scripts | Complete migration committed in `supabase/migrations/` | None for supplied script |
| Vercel live + env vars | Live production deployment Ready; 8/8 browser tests passed on its public URL; both public Supabase variables configured | None for deployment itself |
| GitHub source | Source pushed to `JOKER8946/meal_tracker`; Vercel Git integration connected | None |
| No private credentials in source/client | Source/client-bundle scan passed; generic alphabet literals reviewed; environment files excluded; build refuses non-public Supabase keys; production dependencies report 0 known vulnerabilities | None for audited revision |

The production signup email check requires a mailbox owner to click the link.
Physical phone installation and the user's final confirmation cannot be replaced
by browser emulation.

## Combined production audit

The full Playwright suite passed: **8/8 tests** against the optimized local
production build and **8/8 tests against the live Vercel URL**, using the real
Supabase backend. Checks include auth/session
behavior, signup confirmation UI with a mocked delivery response, real invalid
password rejection, calendar and chart data, two-account UI isolation, notes
rendered as plain text, photo compression/persistence/edit/delete, retry after
deletion failure, sleep validation/edit/delete, 320/390/768/1440px layout, dialog
keyboard dismissal, manifest/icons, service worker and offline behavior.

The SQL suite passed **5/5**, and the date/chart unit suite passed **2/2**.
Production build and TypeScript checks passed. The final live RLS rerun passed
**94 checks** with fixture cleanup. Vercel is signed in; project
`jnyan-p-s-projects/daily-meal-tracker` is linked to GitHub, and the production
environment contains the app's two public Supabase settings. Deployment
`dpl_5sTN4qLyM2CcqsQSCckbYPX5c8Jz` reached Ready from source commit `947b66c`.
The lockfile repair added missing bundled optional-dependency records for Linux;
already-tested runtime package versions were preserved.

## Remaining human checks

1. Supabase **Authentication → URL Configuration**: set Site URL and an allowed
   Redirect URL to `https://daily-meal-tracker-livid.vercel.app`.
2. Create an account through Daily, open its confirmation email, and verify the
   link returns to Daily and login succeeds. Verify a password-reset email too.
3. On the user's phone, select a gallery photo and take a camera photo, install
   Daily, and open it from the home-screen icon.
4. The user confirms the deployed app matches what they wanted. Until then,
   completion remains unproven and the goal must not be marked complete.
