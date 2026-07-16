# Spec 1 — Catalog Foundation

**Date:** 2026-07-16
**Status:** Draft, awaiting review
**Parent:** [App Hub Decomposition](./2026-07-16-app-hub-decomposition.md)

## Scope

The app entity and the surfaces that read it: categories, modules, first-party
seed data, the browse pages, and the detail page. Link-out only.

**In scope:** schema for apps/categories/modules, R2 image storage, migration
history, `/apps` browse, `/apps/:slug` detail, admin CRUD, seed.

**Out of scope (later specs):** submissions, voting, graduation, ratings,
reviews, per-app video, GHL. The `stage` column ships now because it is
structural, but nothing writes anything except `graduated` in this spec.

**Context:** the production DB holds 6 users and 7 posts (see parent spec). There
is no live data to preserve, so this spec restructures directly and skips
backward-compatibility work. Existing community tables are left alone here only
because they are out of scope — not because they are load-bearing.

## Success criteria

1. `baingers.com/apps` lists every seeded first-party app, filterable by category.
2. `baingers.com/apps/omnisend` renders Omnisend with its three modules and a
   working link out.
3. Icons survive a redeploy of prime.
4. A schema change produces a reviewable SQL file in git.
5. Adding a category requires an INSERT, not a deploy.

## Prerequisite A — migration history

Current state: `lib/db/package.json` exposes only `push` and `push-force`.
`lib/db/drizzle.config.ts` has no `out` key, so nothing is emitted. No SQL
artifact, no ordered history, no rollback.

Change:

- Add `out: "./drizzle"` to `drizzle.config.ts`.
- Add scripts: `generate` (drizzle-kit generate), `migrate` (drizzle-kit migrate).
- Baseline the existing 21 tables as migration `0000_baseline` and verify it
  applies cleanly to an empty DB before any new table is written.
- Keep `push` for local scratch only. **Deploys run `migrate`, never `push`.**
- Document in README, correcting the two known bugs found during exploration:
  the `seed` script referenced at README:46 does not exist, and README:79
  describes migrations that do not exist.

Rationale: this spec adds ~5 tables and alters `posts`. Reshaping a populated
production DB through TS-diffing with no rollback is the amzsites failure shape.

## Prerequisite B — image storage on R2

Current state: `routes/uploads.ts` and `routes/me.ts` write to
`path.resolve(process.cwd(), "uploads")` on local disk, served by
`express.static`, and `.gitignore`d. Prime wipes these on redeploy.

Change: an `ObjectStore` interface with an R2 implementation (S3-compatible;
the Cloudflare account already exists for Stream). App icons and screenshots
write to R2 and store the returned URL.

Boundary: this spec introduces the interface and routes app images through it.
Migrating the existing PDF `uploads` table and avatars is explicitly **not** in
scope — they keep working as-is. No behavior change to existing features.

## Schema

New tables in `lib/db/src/schema/`. Serial PKs and explicit `onDelete` to match
existing convention.

### `app_categories` — `app_categories.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `slug` | text unique | `marketing`, `admin`, `logistics`, `tracking` |
| `name` | text | Display name |
| `description` | text | |
| `icon` | text | Lucide icon name |
| `sort_order` | integer default 0 | Matches `channels` convention |
| `created_at` | timestamp | |

Seeded with four rows. **Explore is not among them** — it is a browse surface.

### `apps` — `apps.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `slug` | text unique | URL key |
| `name` | text | |
| `tagline` | text | One line, for cards |
| `description` | text | Long form, detail page |
| `category_id` | integer → `app_categories` | `onDelete: restrict` — never orphan an app |
| `owner_id` | integer → `users` | `onDelete: cascade` |
| `is_first_party` | boolean default false | AMG-built |
| `stage` | text enum | `submitted`/`incubating`/`graduated`/`retired`/`rejected`, default `submitted` |
| `access_type` | text enum | `link_out`/`provisioned`, default `link_out` |
| `external_url` | text nullable | Required when `access_type = link_out` |
| `icon_url` | text nullable | R2 |
| `screenshots` | text[] default `{}` | R2 URLs |
| `graduated_at` | timestamp nullable | |
| `graduated_by` | integer → `users` nullable, `onDelete: set null` | Who pressed the button |
| `created_at` / `updated_at` | timestamp | |

Indexes: `apps_stage_idx`, `apps_category_idx`, `apps_owner_idx`.

`access_type` exists now because GHL (Spec 5) is provisioned, not linked.
Seeded apps are all `link_out`.

### `app_modules` — `app_modules.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `app_id` | integer → `apps` cascade | |
| `name` | text | "Push", "Email", "Android SMS" |
| `description` | text | |
| `sort_order` | integer default 0 | |

Index: `app_modules_app_idx`.

### Enum note

Drizzle's `{ enum: [...] }` is compile-time only — every existing enum in this
schema is an unconstrained `text` column at the DB level. `stage` drives
authorization in later specs (who can vote, who can rate), so it gets a real
`CHECK` constraint in its migration rather than inheriting that weakness.

## API

Public reads, admin writes. Follows existing `requireAuth` / `requireAdmin`
middleware; no new authorization primitives.

```
GET    /api/apps                 ?category=&stage=graduated&q=   list
GET    /api/apps/:slug                                           detail + modules
GET    /api/app-categories                                       list
POST   /api/admin/apps                                           create   [admin]
PATCH  /api/admin/apps/:id                                       update   [admin]
DELETE /api/admin/apps/:id                                       retire   [admin]
POST   /api/admin/apps/:id/icon                                  upload   [admin]
```

`GET /api/apps` defaults to `stage=graduated`. The Incubator is opt-in via
query param and stays empty until Spec 2.

`DELETE` sets `stage = retired`. Apps are never hard-deleted — comments,
ratings, and videos will hang off them in later specs.

Storage layer at `artifacts/api-server/src/storage/apps.ts`, matching the
existing `storage/posts.ts` pattern. Routes stay thin.

## Frontend

`artifacts/portal/src/pages/`:

- `Apps.tsx` — browse. Category rail + grid of app cards. This is **Explore**:
  the default view is all graduated apps; category filter narrows it.
- `AppDetail.tsx` — `/apps/:slug`. Icon, name, tagline, description,
  screenshots, module list, category, prominent link-out CTA.

`artifacts/portal/src/components/apps/`:

- `AppCard.tsx` — icon, name, tagline, category badge
- `AppGrid.tsx` — responsive grid, empty state
- `CategoryRail.tsx` — reads `/api/app-categories`, no hardcoded list
- `ModuleList.tsx` — renders modules; **renders nothing when an app has none**,
  so single-module apps look intentional rather than broken

Nav gets an "Apps" entry. The existing feed, School, events, and chat are
untouched in this spec.

## Seed

`lib/db/src/seed/apps.ts`, idempotent, keyed on slug, safe to re-run.

Four categories, then the first-party apps: Omnisend (3 modules: Push, Email,
Android SMS), Employee Tracker, the CRMs, TrackDrive clone, Overflow clone,
Kingdom (+ Funnel Jacker), Content Studio, Freegaime, Command Center, Patent
Searcher, QuickBooks app, Unibox.

All seeded `is_first_party = true`, `stage = graduated`, `access_type =
link_out`, owned by Daniel's admin user.

**Open — needs Daniel:** each app's category, canonical URL, and one-line
tagline. Seeded with a placeholder URL and `TODO` tagline where unknown; the
detail page hides the CTA when `external_url` is a placeholder, so a
half-filled catalog degrades quietly instead of shipping dead links.

Also fixes the missing `seed` script (README:46).

## Testing

- **Storage unit** — list filters by category and stage; `getBySlug` returns
  modules ordered by `sort_order`; retire sets stage without deleting.
- **API integration** — `/api/apps` excludes non-graduated by default; admin
  routes 403 for members; unknown slug 404s.
- **Migration** — `0000_baseline` applies to an empty DB; new migration applies
  on top; both verified before touching prime.
- **Seed** — idempotent across two consecutive runs.
- **Browser verification** — `/apps` and `/apps/omnisend` loaded on the real
  public URL and visually confirmed before any "done" claim, per the standing
  rule. Icons re-checked after a redeploy to prove R2 works.

## Risks

| Risk | Mitigation |
|---|---|
| Baseline migration diverges from prime's live schema | Diff generated baseline against prime's `information_schema` before applying; never `push-force` |
| R2 misconfigured → icons 404 | Interface + local fallback in dev; verify post-redeploy in browser |
| Seed URLs unknown | Placeholder + hidden CTA; no dead links |
| Two untracked `ecosystem.config.cjs` on prime | Pre-existing. Collapse to one and commit **before** deploying this — same two-configs-no-enforcement shape as amzsites |

## Notes for later specs

- `posts.app_id` (Spec 4) — nullable FK, mirrors the existing soft
  `recording_id` link
- `app_videos` (Spec 4) — join `apps` ↔ `recordings`, with `sort_order` and role
- `app_votes` (Spec 2) — mirrors the existing `suggestion_votes` pattern
- `app_ratings` (Spec 3) — 1–5 + review text, catalog-only
- `app_entitlements` (Spec 5) — user → GHL location ID + status
