# ProjectLinkUMS — Full-ERD Integrated Backend + Web Demo

**Version:** 2 Nov 2026 | **Audience:** Three-person EIS '26 team | **Stack:** Next.js 16, TypeScript, Supabase PostgreSQL/Auth, RLS, database RPC.

This package deliberately follows the **16-entity normalized ERD**, **not the earlier array-based MVP**.

## What is in this package?

- `src/app`: responsive functional pages for login, student profile, discover/create project, project details, matching, application and invitation decisions, beta feedback.
- `src/lib/matching.ts`: tested rule-based matching engine using `skill_id`, `interest_id`, availability time intervals and preferences.
- `src/lib/database.ts`: frontend adapter reading normalized tables and writing through controlled Supabase RPCs.
- `supabase/00_SCHEMA_AUDIT_READ_ONLY.sql`: **first step**, checks friend’s existing database, safely.
- `supabase/10_RLS_AND_GRANTS_REVIEW_FIRST.sql`: optional reviewed security migration. It **refuses existing unrecognized policies**, rather than silently weakening them.
- `supabase/20_ATOMIC_BACKEND_FUNCTIONS.sql`: transactions for save profile, create project, apply, decide, invite, respond, withdraw and notification read.
- `supabase/30_SEED_PUBLIC_CATALOGS.sql`: sample public tags only, **no real user data**.
- `supabase/40_POST_INSTALL_READ_ONLY_CHECKS.sql`: database post-install audit.
- `tests/matching.test.mjs`: 7 local tests for matching.
- `docs`: onboarding, contract and end-to-end QA steps.

### Current verification status

**Verified locally:** 7/7 pure TypeScript matching tests pass using Node 22. TS/TSX parsing tested separately.  
**Not verified:** npm dependency installation, complete Next.js build, database migrations, RLS, authentication, and real end-to-end flow. The authoring environment cannot reach npm registry and has no access to your group's Supabase. The team **must** run the SQL audit and beta/permission tests before publishing any real data.

## 1. Requirements

- Laptop with Node.js 22+, Git, VS Code; npm internet access (on your own laptop).
- **Existing** Supabase project containing full 16-table schema matching `docs/ERD_DATA_DICTIONARY.md`.
- Two controlled Supabase Auth test accounts.
- One GitHub repository for all team members (never paste secrets in GitHub).

## 2. Start from scratch

```bash
# Unzip ProjectLinkUMS_Full_Backend.zip and open the extracted directory.
cd ProjectLinkUMS_Full_Backend
npm install
cp .env.example .env.local    # Windows PowerShell: Copy-Item .env.example .env.local
# Edit .env.local with Supabase Project URL and PUBLISHABLE key (not service_role).
npm run test:matching
npm run typecheck
npm run dev
```

Open `http://localhost:3000` in a browser.

## 3. Existing database: review before migration

In Supabase SQL Editor, **run the files in this order**:

1. **00_SCHEMA_AUDIT_READ_ONLY.sql**: confirm all tables, columns, PK/FKs and RLS policies. Compare to `docs/SCHEMA_CONTRACT.md`.
2. **Backup your project/schema.** Do not run destructive SQL to “fix” a difference without agreement from Developer A.
3. **10_RLS_AND_GRANTS_REVIEW_FIRST.sql** only if the audit matches and existing policies have been reviewed. It stops when another policy name is present; a permissive extra policy would bypass a restrictive policy.
4. **20_ATOMIC_BACKEND_FUNCTIONS.sql** after the RLS/security review; compatible only with the exact documented columns.
5. **30_SEED_PUBLIC_CATALOGS.sql** to make selectable tags available.
6. **40_POST_INSTALL_READ_ONLY_CHECKS.sql** to review policies, RPCs and tag counts.

**No function in this package is a replacement for confirming the actual schema and its constraints.** If one SQL file fails, **do not continue** to the next. Share the exact error and the schema audit with Developer A. The SQL function and RLS scripts have not been executed on the team's database.

## 4. Create beta login accounts

Supabase Dashboard → Authentication → Users → Create/Add user (two test users under your control). In this closed beta, do not enable uncontrolled public signup. Sign in as each through `/login` and use `/profile` to create the corresponding profile record. Create the project as user A and apply as user B.

## 5. Complete two-way demo sequence

A. User A signs in, completes profile, selects skills/interests/availability and opts in to discovery if desired.  
B. User A creates a project and fills requirements and meeting times.  
C. User B signs in, completes profile, searches `/projects`, opens project and applies.  
D. User A opens `/requests` and accepts; B sees `accepted` after refreshing. Check membership row.  
E. User A opens `/matches`, chooses own project, runs matcher and invites a different consenting user (requires a third account).  
F. Invited user opens `/requests` to accept/decline. New membership must be recorded on acceptance.  
G. Each tester opens `/feedback`, records one genuine task result.

### Minimum security QA

- User B **cannot** accept User B’s own application as if they were owner.
- User B **cannot** read private invitations sent to another user.
- User A **cannot** edit User B’s profile or skills via direct Supabase calls.
- Signed-out anonymous session cannot read application rows.
- A candidate who opted out of discovery must not appear in matching results.
- Overfilling `slots_needed` must fail on acceptance even if two owners press Accept nearly simultaneously.
- Check RLS through a real authenticated browser client, **not only the privileged SQL Editor**.

## 6. GitHub team structure

Keep only one repository. Developer A owns `supabase/` migrations and schema contract; Developer B owns UI layout/components; Developer C owns `src/lib/matching.ts`, `src/lib/database.ts`, `/matches`, `/requests`, integration and QA. Submit PRs and merge after testing; never overwrite each other's feature branch or commit `.env.local`.

## 7. Deployment

Push reviewed code to GitHub. Import repository to Vercel. Configure the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel. Validate Auth redirects, database policies and permissions on the deployed URL. **Treat an unprotected public URL as public**; authentication and RLS must be operational before beta testers use it. Use sample accounts for demo capture; do not expose private respondents.

## 8. Boundaries and later work

This version has no AI service, realtime chat, ID verification, password reset UI, email notification service, recurring schedules, score persistence, reputation system or moderation console. `notifications` records are written in the database; a notification list UI is optional. User accounts and deployment are not automatically created by this ZIP.

Project lifecycle RPCs also support setting project status, cancelling pending invitations, and leaving an accepted team; see `docs/SCHEMA_CONTRACT.md`.

The matching weights (40/25/20/15) are an **unvalidated heuristic**. Missing mandatory skills or overlapping time means disqualification; missing nonmandatory criteria uses neutral scores rather than invented 100% compatibility.

See `docs/TEAM_START_HERE_MS.md` for step-by-step Bahasa Melayu instructions.
