# Spec 2 — Incubator (submission · voting · graduation)

**Date:** 2026-07-17
**Status:** Draft, building
**Parent:** [App Hub Decomposition](./2026-07-16-app-hub-decomposition.md) · builds on [Spec 1 Catalog Foundation](./2026-07-16-catalog-foundation-design.md)

## Scope

The tier below the Catalog: members submit their own apps, the community votes,
and an admin graduates the winners into the Catalog. No new entity — a
submission is just an `apps` row with `stage='submitted'`, `is_first_party=false`,
owned by the submitter.

**In scope:** app_votes schema, member submission API, vote toggle API, admin
promote/graduate/reject API, the Incubator browse surface, a submit form, and the
admin graduate control on the detail page.

**Out of scope:** ratings/reviews (Spec 3 — only for *graduated* apps), per-app
video (Spec 4), GHL (Spec 5). Icons still use the placeholder-hidden-CTA rule
from Spec 1; R2 upload for member submissions rides Spec 1's `ObjectStore`.

## Decisions (locked in the decomposition)

- **Votes ≠ ratings.** A vote answers *"should this graduate?"* — incubator-only,
  binary, one per user per app. It stops mattering at graduation. Ratings (Spec 3)
  answer *"is this good?"* and only exist for graduated apps.
- **Votes rank; the admin graduates.** No auto-promotion threshold. Graduation
  puts a stranger's app next to Command Center, so it's a brand decision —
  `graduated_by` records who pressed the button (already on the `apps` table).
- **Stage lifecycle:** `submitted → incubating → graduated` (plus `rejected`,
  `retired`). "Submitted" = brand-new, unreviewed. "Incubating" = admin has
  green-lit it into the public voting pool. This two-step keeps spam/junk out of
  the Incubator browse surface until an admin lets it in.

## Schema

New table `lib/db/src/schema/app_votes.ts`, mirroring `suggestion_votes` exactly:

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `app_id` | integer → `apps` cascade | |
| `user_id` | integer → `users` cascade | |
| `created_at` | timestamp | |

Unique index `app_votes_uniq` on (`app_id`, `user_id`) — one vote per user per app.

No change to `apps` — `stage`, `owner_id`, `graduated_at`, `graduated_by` already
exist from Spec 1.

## API (contract-first — OpenAPI first, then orval, then routes)

```
POST   /apps                      member submits an app -> stage=submitted   [auth]
GET    /apps?stage=incubating      browse incubator, vote-ranked, w/ votedByMe [auth]
POST   /apps/{id}/vote             cast a vote (idempotent)                    [auth]
DELETE /apps/{id}/vote             retract a vote                             [auth]
POST   /admin/apps/{id}/stage      set stage (incubating|graduated|rejected)  [admin]
```

- `POST /apps` (member, not admin): forces `stage=submitted`, `is_first_party=false`,
  `owner_id=current user`, `access_type=link_out`. A member can never self-set
  `graduated` or `is_first_party` — those are server-forced.
- `GET /apps?stage=incubating` returns apps in `submitted`+`incubating`? No —
  **only `incubating`** on the public Incubator surface. `submitted` (unreviewed)
  is admin-only via `?stage=submitted`. Response adds `voteCount` and `votedByMe`.
- Vote endpoints only apply to non-graduated apps (voting a graduated app is a
  no-op 409 — graduation ends voting).
- `POST /admin/apps/{id}/stage {stage}` — on `graduated`, stamps `graduated_at=now`
  and `graduated_by=admin`. On other transitions, just sets stage.

Storage extends `storage/apps.ts`: `submitApp`, `voteAAA/unvote`, `listApps` gains
vote aggregation when a viewer is passed, `setStage`.

## Frontend (`artifacts/portal/src/`)

- `pages/incubator.tsx` — the Incubator surface: incubating apps ranked by votes,
  each with a vote button (filled when `votedByMe`) and vote count. Empty state.
- `components/apps/submit-app-dialog.tsx` — a shadcn Dialog form (name, tagline,
  description, category select, external URL, optional icon) → `POST /apps`.
  Reachable from a "Submit your app" button on both `/apps` and `/incubator`.
- `components/apps/vote-button.tsx` — optimistic toggle, mirrors the existing
  `suggestions.tsx` upvote.
- `pages/app-detail.tsx` (modify) — for `submitted`/`incubating` apps show the
  vote button + count; for admins show a **Graduate / Reject** control that calls
  the stage endpoint. Graduated apps show neither (they're catalog).
- Nav/routing: `/incubator` route in `App.tsx` + an "Incubator" nav entry next to
  "Apps".

## Testing (extends the vitest harness from Spec 1)

- **Storage:** submit forces stage/owner/first-party; vote is idempotent (double
  vote = one row); unvote removes it; `listApps({stage:'incubating', viewerId})`
  returns correct `voteCount`/`votedByMe`, vote-ranked; `setStage('graduated')`
  stamps `graduated_at`/`graduated_by`.
- **Truncate helper** in `harness.ts` gains `app_votes` (before `apps`).
- **Browser:** submit an app → appears in `/incubator` → vote → count increments
  → admin graduates → it leaves `/incubator` and appears in `/apps`. Verified on
  the real domain per the standing rule.

## Risks

| Risk | Mitigation |
|---|---|
| Member self-sets `graduated`/`is_first_party` via `POST /apps` | Server forces those fields; never read from the member body |
| Vote race → duplicate rows | Unique index + `onConflictDoNothing` |
| Spam submissions flood the Incubator | Two-step: `submitted` (hidden) → admin lets into `incubating` (public) |
| Graduating loses vote history | Votes are kept (rows persist); they just stop being shown/collected once graduated |
