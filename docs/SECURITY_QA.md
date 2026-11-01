# Full ERD RLS and Backend Security QA

> Do not treat SQL Editor output as proof of user-level RLS. Test as ordinary authenticated users A and B through the browser (or Supabase client with their sessions).

## Before connecting any beta tester

- [ ] Backup complete before migration.
- [ ] `00_SCHEMA_AUDIT_READ_ONLY.sql` matches exact names/defaults.
- [ ] Review all previous policies. RLS script must not coexist with unauthorized permissive policies.
- [ ] All 15 public tables have RLS on.
- [ ] `anon` has no SELECT or write privileges on user data.
- [ ] `authenticated` cannot directly INSERT into `applications`, `project_members`, or `notifications`.
- [ ] Protected functions have authenticated-only EXECUTE; `private` schema not exposed in Data API configuration.
- [ ] No `service_role` or secret API key in browser, GitHub or Vercel public variables.
- [ ] Profile discoverable OFF initially; user must opt in explicitly.

## Positive cases

| Actor | Attempt | Expected |
|---|---|---|
| A | `save_my_profile` with own profile | Success |
| A | Create open project | Success; owner member row created |
| B | Apply to A's open project | `applications.pending` |
| A | Accept B | Member row appears; status accepted |
| A | Invite consenting C | Pending invitation and notification |
| C | Accept own invitation | Membership created |
| B | View B's application | Allowed |

## Negative cases

| Actor | Attempt | Expected |
|---|---|---|
| Signed out | Query `profiles` / `applications` | No private data |
| B | Accept B's own application via RPC | DENIED |
| B | Direct INSERT `project_members` using public key | DENIED |
| A | Invite undiscoverable C | DENIED |
| C | Respond to B's invitation | DENIED |
| A | Accept 2 applications when only one slot remains | Second is DENIED |
| A | Re-accept already decided application | DENIED |
| A | Insert a `notification` directly as another recipient | DENIED |
| B | Apply to own project | DENIED |
| B | Apply same project twice | DENIED by uniqueness |
| C | View private application of A/B | DENIED |

## Bug report details

Collect test user IDs (non-sensitive test IDs only), precise actions, time, database error text and screenshot without secrets. Report issue severity P0 if privacy or permissions fail, P1 if core request flow fails, P2 for matching/UI confusion, P3 for cosmetics.

Avoid running security scripts until Developer A has checked the live schema; SQL changes are not automatically reversible by simply undoing Git commits.
