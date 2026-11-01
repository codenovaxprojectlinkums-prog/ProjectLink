# ProjectLinkUMS — Full ERD & Data Dictionary

**Design:** Supabase Auth + PostgreSQL, Next.js web application. **Version:** 1 November 2026.

This document defines a complete **target logical data model**, including core MVP tables and extensions. The earliest ProjectLinkUMS starter proposed `skills[]`, `interests[]`, and `availability[]` arrays inside profiles/projects. **Do not attempt to create the normalized join tables on top of an already-deployed array-based schema without a migration.** Use the core MVP design first for the November 4 deadline, then migrate to the target design in a separate planned step. Never silently mix two field contracts in one frontend.

## Priorities

| Priority | Tables | Purpose |
|---|---|---|
| **P0 — by 4 Nov** | `auth.users`, `profiles`, `projects`, `applications`, `project_members` | Accounts, project listing, join request, accepted team members. |
| **P1 — only if time** | `skills`, `student_skills`, `interests`, `student_interests`, `availability_slots`, `project_required_skills`, `project_interests`, `project_meeting_slots`, `project_invitations` | Normalized skill matching, time overlap, invite a student to a project. |
| **P2 — after submission** | `notifications`, `beta_test_results` | In-app alerts and structured test feedback. |

### Schema contract warning

Full model is a long-term **normalized version**: `skills` and `interests` have catalog tables and bridge tables. If you have already built the earlier 3-table MVP, use the arrays in that code until after the deadline, rather than rewriting everything for normalization tonight. See `ProjectLinkUMS_Core_MVP_ERD.mmd` for the immediately necessary relationships; the core diagram **explicitly preserves `skills[]`, `interests[]`, `availability[]` and other array fields** in the original MVP. The full ERD is a normalized target that replaces array fields with join tables. If migrating later, write data backfill scripts and modify the frontend contract together.

## Tables and columns

### AUTH_USERS (P0)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `email` | `text` | Supabase-managed |
| `created_at` | `timestamptz` | Supabase-managed |

### PROFILES (P0)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK, FK → auth.users.id |
| `display_name` | `text` | NOT NULL |
| `faculty` | `text` | NOT NULL |
| `programme` | `text` | — |
| `year_of_study` | `smallint` | 1–8 |
| `bio` | `text` | — |
| `avatar_url` | `text` | — |
| `weekly_hours` | `smallint` | 0–168 |
| `preferred_project_types` | `text[]` | e.g. Competition / Assignment |
| `discoverable` | `boolean` | DEFAULT FALSE |
| `consent_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | DEFAULT now() |
| `updated_at` | `timestamptz` | DEFAULT now() |

### SKILLS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | UNIQUE NOT NULL |
| `category` | `text` | — |

### STUDENT_SKILLS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `student_id` | `uuid` | PK, FK → profiles.id |
| `skill_id` | `uuid` | PK, FK → skills.id |
| `proficiency` | `text` | beginner / intermediate / advanced |

### INTERESTS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | UNIQUE NOT NULL |

### STUDENT_INTERESTS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `student_id` | `uuid` | PK, FK → profiles.id |
| `interest_id` | `uuid` | PK, FK → interests.id |

### AVAILABILITY_SLOTS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `student_id` | `uuid` | FK → profiles.id |
| `weekday` | `smallint` | 1 = Mon … 7 = Sun |
| `start_time` | `time` | NOT NULL |
| `end_time` | `time` | end > start |

### PROJECTS (P0)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK → profiles.id |
| `title` | `text` | NOT NULL |
| `description` | `text` | — |
| `project_type` | `text` | enum-like |
| `slots_needed` | `smallint` | >= 1 |
| `min_weekly_hours` | `smallint` | >= 0 |
| `status` | `text` | open / closed / completed |
| `deadline` | `date` | nullable |
| `created_at` | `timestamptz` | DEFAULT now() |
| `updated_at` | `timestamptz` | DEFAULT now() |

### PROJECT_REQUIRED_SKILLS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `project_id` | `uuid` | PK, FK → projects.id |
| `skill_id` | `uuid` | PK, FK → skills.id |
| `mandatory` | `boolean` | DEFAULT TRUE |
| `importance` | `smallint` | 1–5 |

### PROJECT_INTERESTS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `project_id` | `uuid` | PK, FK → projects.id |
| `interest_id` | `uuid` | PK, FK → interests.id |

### PROJECT_MEETING_SLOTS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `project_id` | `uuid` | FK → projects.id |
| `weekday` | `smallint` | 1–7 |
| `start_time` | `time` | NOT NULL |
| `end_time` | `time` | end > start |

### APPLICATIONS (P0)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `project_id` | `uuid` | FK → projects.id |
| `applicant_id` | `uuid` | FK → profiles.id |
| `note` | `text` | — |
| `status` | `text` | pending / accepted / declined / withdrawn |
| `created_at` | `timestamptz` | DEFAULT now() |
| `responded_at` | `timestamptz` | nullable |

### PROJECT_MEMBERS (P0)

| Column | Type | Constraint / purpose |
|---|---|---|
| `project_id` | `uuid` | PK, FK → projects.id |
| `student_id` | `uuid` | PK, FK → profiles.id |
| `member_role` | `text` | owner / member |
| `membership_status` | `text` | active / left / removed |
| `joined_at` | `timestamptz` | DEFAULT now() |

### PROJECT_INVITATIONS (P1)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `project_id` | `uuid` | FK → projects.id |
| `inviter_id` | `uuid` | FK → profiles.id |
| `invitee_id` | `uuid` | FK → profiles.id |
| `note` | `text` | — |
| `status` | `text` | pending / accepted / declined / cancelled |
| `created_at` | `timestamptz` | DEFAULT now() |
| `responded_at` | `timestamptz` | nullable |

### NOTIFICATIONS (P2)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `recipient_id` | `uuid` | FK → profiles.id |
| `event_type` | `text` | — |
| `target_type` | `text` | — |
| `target_id` | `uuid` | polymorphic reference; validate server-side |
| `read_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | DEFAULT now() |

### BETA_TEST_RESULTS (P2)

| Column | Type | Constraint / purpose |
|---|---|---|
| `id` | `uuid` | PK |
| `tester_id` | `uuid` | FK → profiles.id, nullable |
| `task_code` | `text` | e.g. T01 |
| `success` | `boolean` | nullable |
| `duration_seconds` | `int` | >= 0 |
| `difficulty_1_to_5` | `smallint` | 1–5 |
| `comment` | `text` | — |
| `created_at` | `timestamptz` | DEFAULT now() |

## Relationships & cardinalities

- `auth.users` **1 → 0..1** `profiles`: each Auth account has at most one student profile; a new Auth account may have none until onboarding.
- `profiles` **1 → 0..N** `projects`: a student can own any number of projects; a project has one owner.
- `profiles` **M ↔ N** `skills` via `student_skills`; one skill can belong to many students.
- `profiles` **M ↔ N** `interests` via `student_interests`.
- `profiles` **1 → 0..N** `availability_slots`: weekday/time preferences.
- `projects` **M ↔ N** `skills` via `project_required_skills`; required skills can be mandatory or optional.
- `projects` **M ↔ N** `interests` via `project_interests`.
- `projects` **1 → 0..N** `project_meeting_slots`: weekly meeting requirements.
- `profiles` **M ↔ N** `projects` via `applications`: request or interest submitted by student; `UNIQUE(project_id, applicant_id)` prevents duplicates.
- `profiles` **M ↔ N** `projects` via `project_members`: accepted members; composite `PRIMARY KEY(project_id, student_id)` prevents duplicate membership. One project may have multiple members.
- `profiles` **M ↔ N** `projects` via `project_invitations`: project owners invite students; distinct direction from a student's own application.
- `profiles` **1 → 0..N** `notifications` and `beta_test_results` (optional).

## Domain rules developers must implement

1. **Single identity:** `profiles.id = auth.users.id`. Passwords remain only in Supabase Auth, never in public tables. Email comes from authenticated Supabase user metadata, not from a public profile column.
2. **No project self-application:** `applicant_id != projects.owner_id` (enforce in a trusted transaction/server-side rule, not only UI).
3. **Eligibility:** only open projects accept requests. `status='pending'` on creation, and only the project owner can accept/decline. Applicant may withdraw own pending request. Only relevant parties can view private applications.
4. **No duplicate application:** `UNIQUE(project_id, applicant_id)`; if resubmission is needed, specify a deliberate resubmission policy.
5. **Membership:** acceptance should create one `project_members` row **atomically** with the application update. Owner can be inserted as the project’s first member via a trusted function/trigger. Do not create members from a direct client INSERT without appropriate owner and acceptance checks.
6. **Project invitation:** only the project owner (or explicitly authorized role) can invite. Invitee alone accepts/declines. Acceptance must create `project_members` atomically. `UNIQUE(project_id, invitee_id)` is the simplest one-invite-per-project rule.
7. **Capacity:** `slots_needed` is the number of *additional* students sought, not the total team size. Reject approval once the cap is reached, using an atomic transaction to prevent simultaneous overfill.
8. **Skill matching:** required skill intersection is assessed first. Missing a *mandatory* skill can mark ineligible even if weighted score is high. Do not infer proficiency from a student’s skill tag alone.
9. **Time matching:** `weekday=1..7`, local `Asia/Kuching`, `end_time > start_time` and compare interval overlap; a matching `weekend` text token is less accurate than precise slots.
10. **Score:** compute candidate compatibility dynamically from permitted data; **no `matches` table is necessary**. Weighted scoring is a hypothesis pending beta validation. Do not expose scores of students who opted out of discovery.
11. **Visibility/privacy:** `discoverable = TRUE` must be a voluntary opt-in with a `consent_at` timestamp. No direct phone or matriculation-number exposure. Contacts may be shared later only with mutual consent.
12. **Notifications:** optional; `target_type/target_id` are polymorphic, so referential integrity cannot be enforced by a simple FK. Validate references in trusted code (or switch to one nullable FK per target type).
13. **Beta data:** use anonymous tester IDs where possible; record only data strictly needed for usability analysis. Never automatically import previous research respondents into user accounts.

## Supabase Row-Level Security (RLS) matrix

| Table | SELECT | INSERT | UPDATE/DELETE |
|---|---|---|---|
| `profiles` | Self; discoverable profiles to signed-in students (only approved public fields) | Own `auth.uid()` | Owner only |
| `projects` | Open published projects; creator sees own draft/closed | Signed-in owner | Project owner only |
| `applications` | Applicant and relevant project owner | Applicant only, eligible open project | Applicant may withdraw; owner may accept/decline via trusted operation |
| `project_members` | Members and project owner; public member list only if deliberately enabled | Trusted acceptance transaction | Authorized owner/member only according to lifecycle |
| Skill / interest joins | Public only for discoverable profile; owner can see own | Owner only | Owner only |
| `project_required_skills`, `project_interests`, `project_meeting_slots` | Visible along with project | Project owner | Project owner |
| `project_invitations` | Inviter, invitee, project owner | Owner or authorized inviter | Invitee responds; inviter cancels |
| `notifications` | Recipient only | Trusted server | Recipient can mark read; no client forging notifications |
| `beta_test_results` | Tester own record or authorized researchers | Consent-based | Researcher/admin with separate protected role |

**Important:** a row-level SELECT policy for profiles exposes **all columns in that row** that the role is allowed to select, not just named public fields. Keep private contact and verification data in a separate protected table if they are added. `anon` access should be disabled by default. On Supabase, explicitly configure grants and RLS for public tables, then test allow/deny cases using separate authenticated users.

## Matching formula (not a stored field)

`final_score = 0.40 * skill_fit + 0.25 * interest_fit + 0.20 * availability_fit + 0.15 * goals_fit` where each factor is scored from 0 to 100. The database does not require a `matching_scores` table for an MVP. Matching is a view/computation performed when someone browses candidates; future caching can be added after usage data exists.

## Example workflows

**Student applies for project:** `auth.users` → `profiles` → `projects` → `applications(status='pending')` → owner decides → `project_members` on acceptance.

**Project owner searches student:** `projects` → `project_required_skills` / `project_interests` / `project_meeting_slots` ↔ `student_skills` / `student_interests` / `availability_slots` → candidates ordered by score; invite via `project_invitations` if that optional feature is implemented.

**Beta test:** Signed-in tester completes tasks → `beta_test_results` (optional; Google Forms is sufficient for November 4).

## Implementation order (3 people)

**Developer A**: Auth, `profiles`, `projects`, `applications`, RLS, secure accept/decline transaction. **Developer B**: UI forms and listing/navigation using agreed field names. **Developer C**: matching calculation, applications page, two-user integration tests, beta feedback collection.

## Essential tests before beta

- Student A cannot edit Student B’s profile or project.
- Student A cannot accept Student B’s application on a project they do not own.
- No applicant can create duplicate pending applications for same project.
- Accepted application creates exactly one member entry.
- Declined application does not create membership.
- Discoverable=false prevents the student from appearing in public search.
- Closed projects cannot receive new applications.
- No secret/server API key is exposed in client-side code.
- Only approved demo accounts or consenting beta testers can log in.
