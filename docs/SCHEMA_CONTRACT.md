# FULL ERD — SCHEMA CONTRACT (EXACT)

A shared contract for Developer A/B/C. Before applying SQL, compare columns in live Supabase to `00_SCHEMA_AUDIT_READ_ONLY.sql` output.

**AUTH:** `auth.users(id uuid PK)` owned by Supabase; `profiles.id` must FK reference this id.

| Table | Expected columns used by code |
|---|---|
| `profiles` | `id uuid PK`, `display_name text`, `faculty text`, `programme text`, `year_of_study smallint`, `bio text`, `avatar_url text`, `weekly_hours smallint`, `preferred_project_types text[]`, `discoverable boolean`, `consent_at timestamptz`, `created_at timestamptz`, `updated_at timestamptz` |
| `skills` | `id uuid PK`, `name text UNIQUE`, `category text` |
| `student_skills` | `student_id uuid`, `skill_id uuid`, `proficiency text`; composite PK `(student_id,skill_id)` |
| `interests` | `id uuid PK`, `name text UNIQUE` |
| `student_interests` | `student_id uuid`, `interest_id uuid`; composite PK |
| `availability_slots` | `id uuid PK`, `student_id uuid`, `weekday smallint 1..7`, `start_time time`, `end_time time` |
| `projects` | `id uuid PK`, `owner_id uuid`, `title text`, `description text`, `project_type text`, `slots_needed smallint`, `min_weekly_hours smallint`, `status text`, `deadline date`, `created_at timestamptz`, `updated_at timestamptz` |
| `project_required_skills` | `project_id uuid`, `skill_id uuid`, `mandatory boolean`, `importance smallint`; composite PK |
| `project_interests` | `project_id uuid`, `interest_id uuid`; composite PK |
| `project_meeting_slots` | `id uuid PK`, `project_id uuid`, `weekday smallint`, `start_time time`, `end_time time` |
| `applications` | `id uuid PK`, `project_id uuid`, `applicant_id uuid`, `note text`, `status text`, `created_at timestamptz`, `responded_at timestamptz`; unique `(project_id,applicant_id)` |
| `project_members` | `project_id uuid`, `student_id uuid`, `member_role text`, `membership_status text`, `joined_at timestamptz`; composite PK |
| `project_invitations` | `id uuid PK`, `project_id uuid`, `inviter_id uuid`, `invitee_id uuid`, `note text`, `status text`, `created_at timestamptz`, `responded_at timestamptz`; unique `(project_id,invitee_id)` |
| `notifications` | `id uuid PK`, `recipient_id uuid`, `event_type text`, `target_type text`, `target_id uuid`, `read_at timestamptz`, `created_at timestamptz` |
| `beta_test_results` | `id uuid PK`, `tester_id uuid`, `task_code text`, `success boolean`, `duration_seconds integer`, `difficulty_1_to_5 smallint`, `comment text`, `created_at timestamptz` |

## Expected defaults

All UUID primary keys except `profiles.id` (auth-owned) must have a UUID generator default (e.g. `gen_random_uuid()`), or the RPC insertion needs explicit IDs. All timestamp columns used for INSERT without a supplied value need `default now()`. `status`, `joined_at`, `membership_status` defaults may differ if the RPC supplies them explicitly, but verify. If missing, ask Developer A to create an approved migration **after** backup, not to manually alter data at random.

## Application state transitions

- `applications`: `pending → accepted/declined/withdrawn`. Cannot accept twice.
- `project_invitations`: `pending → accepted/declined` (optional cancel action not supplied).
- `project_members`: created as owner with project, or member after accepted application/invitation. `slots_needed` counts member-role `member` with status `active`, not owner.
- `profiles.discoverable`: false by default, with `consent_at` null; becomes discoverable only after user enables and saves.
- `projects.status`: default open; project editing / closing is not included in this beta UI.

## RPC surface used by Next.js

| Name | Input parameters | Return |
|---|---|---|
| `save_my_profile` | `p_display_name`, `p_faculty`, `p_programme`, `p_year_of_study`, `p_bio`, `p_weekly_hours`, `p_preferred_project_types`, `p_discoverable`, `p_skills`, `p_interests`, `p_slots` | void |
| `create_project` | `p_title`, `p_description`, `p_project_type`, `p_slots_needed`, `p_min_weekly_hours`, `p_deadline`, `p_required_skills`, `p_interests`, `p_meeting_slots` | UUID |
| `apply_to_project` | `p_project_id`, `p_note` | UUID |
| `decide_application` | `p_application_id`, `p_decision` | void |
| `withdraw_application` | `p_application_id` | void |
| `invite_candidate` | `p_project_id`, `p_invitee_id`, `p_note` | UUID |
| `respond_invitation` | `p_invitation_id`, `p_decision` | void |
| `mark_notification_read` | `p_notification_id` | void |
| `set_project_status` | `p_project_id`, `p_status` | void |
| `cancel_invitation` | `p_invitation_id` | void |
| `leave_project` | `p_project_id` | void |

All RPCs use `auth.uid()` to establish identity; never trust caller-supplied owner/applicant IDs. `public` wrapper functions use SECURITY INVOKER and delegate to access-checked private functions. Public wrapper execute permission is restricted to `authenticated`.

## RLS & existing database caution

PostgreSQL RLS policies are combined with OR when permissive. **Adding a new restrictive-looking permissive policy will NOT negate an old `USING (true)` policy.** `10_RLS_AND_GRANTS_REVIEW_FIRST.sql` therefore refuses to proceed if it detects non-`pkl_*` policies, and the team must review differences deliberately. This script does not assert that previously created policies are safe.

## API naming

Do not refer to `profiles.skills`, `profiles.interests` or `projects.required_skills` as columns: those fields belong to link tables in the FULL schema. `src/lib/database.ts` resolves the link tables to structured objects before passing them to the matching engine.
