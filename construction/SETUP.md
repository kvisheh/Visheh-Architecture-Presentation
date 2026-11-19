# کارگاه — GitHub Pages frontend + private Supabase backend

Live frontend: https://kvisheh.github.io/Visheh-Architecture-Presentation/construction/

The GitHub Pages files are public by nature. They contain no passwords or records. The default demo uses in-memory synthetic data only. Do not enter real financial records until the private backend is connected. Refresh clears the demo.

## Activate private records

1. Create a Supabase project whose Auth/Storage service is accessible from the intended devices and location. Disable self-service signups in Auth settings. Configure the allowed origin to `https://kvisheh.github.io` and appropriate Supabase CORS for REST/Auth/Storage (the Edge function has explicit origin checks).
2. Run `backend/schema.sql` in Supabase SQL Editor. Create two Auth email users in the Supabase Auth dashboard with long random passwords; confirm both accounts, and copy their user UUIDs. The email/password pair is only used by the Edge function, never by the frontend.
3. In SQL Editor, with actual UUID values:
   `insert into public.app_roles(user_id,role) values ('TEAM_UUID','team'),('CLIENT_UUID','client');`
   `insert into public.projects(name,location,budget) values ('پروژه من','',0) returning id;`
   `insert into public.project_access(project_id,user_id) values ('PROJECT_UUID','TEAM_UUID'),('PROJECT_UUID','CLIENT_UUID');`
   Repeat project/access entries for new projects, and add only clients meant to see each project. This starter uses one shared identity per role, so there is no per-person audit within a role.
4. Set Supabase Edge Function secrets `TEAM_CODE`, `CLIENT_CODE` (distinct, high-entropy shared passphrases), `TEAM_AUTH_EMAIL`, `TEAM_AUTH_PASSWORD`, `CLIENT_AUTH_EMAIL`, `CLIENT_AUTH_PASSWORD`, and random `LOGIN_SALT`. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never commit these secrets.
5. Deploy `backend/site-login/index.ts` as Edge Function `site-login` with JWT verification disabled for this login endpoint only. Keep the rest of the API under Supabase Auth/RLS. The function enforces its own origin and 15-minute rate limits.
6. Put **only** the public Supabase project URL and anon/publishable key into `config.js`, and publish that file to Pages. Test each code, client visibility, receipt access, and logout in separate browser sessions before using real data.

The team code can add and edit categories, budget, payments, work logs, goods and progress. The client code retrieves only project metadata, explicitly visible payments (without budget snapshots), visible goods and visible progress. Receipts stay private and can be read by team or the client for visible nonvoided payments. Production payment rows are append-only through an atomic SQL function; the printable slip freezes the budget and balance at registration time. Changing the budget later changes the current dashboard balance, not historic slips.

## Current scope

This first release covers payments, budget, receipt uploads, printable slips, worker quantities and rates, goods movements, progress updates, and remembered editable suggestions. Inventory balances, wage disbursement linking, project creation UI, accounting exports, and per-user audit should be designed before relying on them for formal bookkeeping. Dana uses a local installed copy if present; supply a licensed webfont for consistent typography.
