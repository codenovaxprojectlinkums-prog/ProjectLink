# ProjectLinkUMS — RPC PGRST202 Fix (v2, 2 November 2026)

## Why "Could not find public.save_my_profile(...) in schema cache"?

The Next.js frontend calls Supabase `rpc('save_my_profile', {...})`. The **16-table ERD does not itself create any RPC functions**. Those functions are in `supabase/20_ATOMIC_BACKEND_FUNCTIONS.sql`.

On review, the original v1 migration contains an authoring error: PL/pgSQL blocks ended `END $fn$;` instead of `END; $fn$;` (11 occurrences). The companion RLS migration also had `END $check$;` instead of `END; $check$;`. PostgreSQL requires a semicolon on the final PL/pgSQL `END;`. Thus the v1 scripts were not reliably deployable. This v2 corrects both files, without altering the 16-table design.

**Do not wipe your database. Do not disable RLS. Do not put a service-role key into the browser.**

### Steps (Developer A):

1. Verify you are working in the SAME Supabase project that Next.js `.env.local` points to. Only share the project ref/hostname (not secret keys).
2. In Supabase SQL Editor, run `supabase/05_CHECK_PROFILE_RPC_READ_ONLY.sql`. Check if `public.save_my_profile` exists and its 11 parameter names match `src/lib/database.ts`.
3. If the function exists with exactly matching names and signature, **do not reinstall functions**; run `NOTIFY pgrst, 'reload schema';` and retry profile saving. If the function is missing, continue.
4. If functions are missing, run `supabase/00_SCHEMA_AUDIT_READ_ONLY.sql` and compare with `docs/SCHEMA_CONTRACT.md`. Confirm all 15 public tables exist and data types match. Take a backup before migrations.
5. If existing RLS policies are already installed and secure, **do not run 10 again by default**. If RLS policies were NOT installed, review the existing policies and only then run the **corrected** `supabase/10_RLS_AND_GRANTS_REVIEW_FIRST.sql`. It deliberately rejects unrecognized policies. **Check for any SQL error; if 10 fails, stop.**
6. After all relevant schema columns and RLS requirements are checked, run **corrected** `supabase/20_ATOMIC_BACKEND_FUNCTIONS.sql` (as a full file, not a fragment). The file uses a transaction; any error aborts it. It ends by reloading PostgREST schema cache.
7. Run `supabase/40_POST_INSTALL_READ_ONLY_CHECKS.sql` and confirm `save_my_profile` exists; return to web app, refresh, login and save profile again.
8. If error remains, copy the output of `05_CHECK_PROFILE_RPC_READ_ONLY.sql` and the exact Supabase SQL Editor error (remove keys). If a new error is about columns/constraints, stop and reconcile actual table schema before modifying SQL.

### Correct signature

```
public.save_my_profile(
  p_display_name text, p_faculty text, p_programme text, p_year_of_study smallint,
  p_bio text, p_weekly_hours smallint, p_preferred_project_types text[],
  p_discoverable boolean, p_skills jsonb, p_interests uuid[], p_slots jsonb
)
```

The frontend argument names already match this definition. The frontend uses **full normalized tables** `student_skills`, `student_interests`, and `availability_slots` inside the function; no `profiles.skills` array is used.

### Verification status

Patched files have been checked by static inspection and names/call contracts compared. They have **NOT** been executed against your Supabase project. Database-specific types, constraints, triggers and policies still require inspection and live testing.
