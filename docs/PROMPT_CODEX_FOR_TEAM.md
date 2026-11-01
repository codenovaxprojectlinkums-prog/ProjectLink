# Ready-to-copy Prompt for Codex

You are assisting the ProjectLinkUMS three-person development team. The repository contains a Next.js 16 / TypeScript / Supabase closed-beta application for UMS student project collaboration. It uses the **full normalized 16-entity ERD** from `docs/ERD_DATA_DICTIONARY.md`, **not** skills arrays in profiles. The SQL migration files may not yet have been applied. **Never assume migrations are deployed without evidence.**

Tasks:
1. Read `docs/SCHEMA_CONTRACT.md`, `src/lib/types.ts`, `src/lib/matching.ts`, `src/lib/database.ts`, and all `supabase/*.sql`.
2. Audit mismatches between actual Supabase column names (from a SQL Editor screenshot/output) and our TypeScript/RPC contract. Do not invent fields.
3. Complete/repair Next.js app pages so that account A can create a profile and project, account B can apply, A can accept, and B sees the accepted status after refresh; then A can match consenting candidates and invite account C, which can accept.
4. Keep all data writes security-checked. No service_role secrets or database credentials in browser. Use existing private transactional RPC + public invoker wrappers.
5. Add error states, accessible labels, mobile-responsive layout and loading states while preserving current routes and table names.
6. Write/re-run matching tests and add reproducible smoke tests. Run npm install, npm run typecheck, npm run test:matching, and npm run build in the user's laptop/agent environment.
7. Report which commands actually passed, which were blocked, and show the exact blocking error. Do not claim real Supabase integration unless tested with separate authenticated accounts.

Assign distinct file ownership: Developer A = `supabase/`, Developer B = UI/style, Developer C = matching+adapter+integration. Avoid simultaneous changes to shared files without PR review.
