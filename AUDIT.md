# Daily acceptance audit

The goal remains open until the production deployment is verified and the user
confirms the app on their phone. A passed local check is not a deployed result.

| Requirement | Current evidence | Remaining verification |
| --- | --- | --- |
| Email/password auth, private users | Real login/logout/session browser tests; 94 live database/Storage checks with two accounts | Real signup email confirmation; production URL configuration |
| Photo compression before upload | Browser inspected compressed preview: <200,000 bytes, ≤1,280px; downloaded Storage image matched | Camera/gallery behavior on user's phone |
| Meal fields and persistence | Production browser create/reload/edit/delete test; failed deletion shows an in-dialog error and retries | None for implemented flow |
| Sleep across midnight | SQL duration/DST tests; production browser overnight create/reload/edit/delete and invalid-time rejection | None for implemented flow |
| Calendar/history | Production date selection loads matching sleep; meal/day CRUD tested | None for implemented flow |
| Weekly charts | Aggregation unit test; production live sleep and meal-count table/chart agreement | None for implemented flow |
| PWA | Production manifest, icons, worker, cache boundary, offline page passed in Chrome | Physical phone installation |
| Maximalist mobile design | Rendered previews inspected; 320/390/768/1440px overflow and navigation tests passed; Framer Motion implemented | User visual acceptance |
| SQL/RLS/Storage scripts | Complete migration committed-ready in `supabase/migrations/` | None for supplied script |
| Vercel live + env vars | Production build passes; setup instructions provided | Vercel authentication, deploy, live smoke tests |
| GitHub source | Existing remote `JOKER8946/meal_tracker` | Source commit and push |
| No private credentials in source/client | Source/client-bundle scan passed; generic alphabet literals reviewed; environment files excluded; build refuses non-public Supabase keys | Recheck after deployment |

The production signup email check requires a mailbox owner to click the link.
Physical phone installation and the user's final confirmation cannot be replaced
by browser emulation.

## Combined production audit

The full Playwright suite passed: **8/8 tests** against the optimized local
production build, using the real Supabase backend. Checks include auth/session
behavior, signup confirmation UI with a mocked delivery response, real invalid
password rejection, calendar and chart data, two-account UI isolation, notes
rendered as plain text, photo compression/persistence/edit/delete, retry after
deletion failure, sleep validation/edit/delete, 320/390/768/1440px layout, dialog
keyboard dismissal, manifest/icons, service worker and offline behavior.

The SQL suite passed **5/5**, and the date/chart unit suite passed **2/2**.
Production build and TypeScript checks passed. The final live RLS rerun passed
**94 checks** with fixture cleanup. Vercel is signed in; project
`jnyan-p-s-projects/daily-meal-tracker` is linked to GitHub, and the production
environment contains only the app's two public Supabase settings. Deployment is next.
