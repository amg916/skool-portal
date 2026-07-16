# Baingers App Hub — Decomposition

**Date:** 2026-07-16
**Status:** Approved direction, specs in progress

## Goal

Turn Baingers from an AI-video community into a community-driven **app hub**: a
categorized catalog of Alpha Marketing Group's apps, open to user-submitted apps
that earn their way in via community votes, with ratings, comments, and
first-party walkthrough video on every app.

Name stays: **Baingers** = "B-*ai*-ngers" — banger AI apps. The pun carries over
to the catalog intact. Build in place; no fork, no new domain.

## Current state — this is a prototype, not a live community

Measured on prime 2026-07-16:

| users | posts | recordings | comments | lessons | DMs | reactions |
|---|---|---|---|---|---|---|
| 6 | 7 | 15 | 1 | 2 | 2 | 1 |

Signups: 5 in May 2026, 1 in July. **There is no audience to disrupt and no
brand equity to protect.** This is the decisive context for everything below:

- We restructure aggressively rather than bolting columns onto live tables.
  Defensive compatibility work is unwarranted — there is no data to preserve.
- Installing migration history now costs nothing. Post-launch it is the
  difference between a rollback and a data-loss incident. **Now is the cheapest
  this fix will ever be.**
- The value being reused is the **codebase**, not the community: the
  record → Cloudflare Stream → Whisper → Claude-tagging pipeline (15 recordings
  prove it works), Google OAuth + sessions, comments/reactions/bookmarks, DMs,
  the `suggestion_votes` voting pattern, and the whole deploy stack. Roughly 70%
  of the target product already exists. The catalog is the only new machinery.

## Product shape

Two tiers, one entity:

- **Incubator** — user submissions. Votable. Not yet endorsed.
- **Catalog** — graduated apps + AMG first-party apps. Rateable. Production.

An app's `stage` controls which surface it appears on. Graduation is a column
flip, not a migration between systems.

## Decisions made

| Decision | Choice | Rationale |
|---|---|---|
| What a user "uploads" | A **listing** (metadata, icon, screenshots, link) — no user code executes on our infra | Graduation stays a curation decision, not a security incident |
| Existing community | **Kept.** Apps become the center; feed and School re-point at apps | Reuses the video pipeline; deletes nothing that works |
| Access to AMG apps | **Link out.** Apps keep their own auth | Zero coupling; live apps stay untouched |
| GHL access | **Provisioned** via GHL SaaS Mode | GHL is the exception — accounts get created, not linked |
| Graduation gate | **Votes rank; admin promotes** | Graduation implies AMG endorsement — a brand call |
| Votes vs ratings | **Separate** | See "Votes are not ratings" below |
| Categories | **Table, not enum** | Add a category with an INSERT, not a schema push |
| Explore | **Browse surface, not a category** | A category named Explore swallows apps and hides them |

## Votes are not ratings

Deliberately two mechanisms:

- **Vote** — "should this graduate?" Incubator-only. Binary. Stops accruing at
  graduation.
- **Rating** — "is this app good?" 1–5 + review text. Catalog-only. Requires the
  app to be live and usable.

Merging them would let a popular Incubator app arrive in the Catalog carrying a
5-star history it never earned.

## Apps have modules

Omnisend is Push + Email + Android SMS. An app is not flat. Modules are a child
table so Omnisend is one catalog entry with three modules, rather than three
listings competing in search.

## Seed catalog (first-party)

Categories: **Marketing · Admin · Logistics · Tracking**
(Explore is a surface, not a category.)

Known apps to seed — Omnisend (Push/Email/Android SMS), Employee Tracker,
the CRMs, TrackDrive clone, Overflow clone, Kingdom (+ Funnel Jacker),
Content Studio, Freegaime, Command Center, Patent Searcher, QuickBooks app,
Unibox. Category assignment and canonical URLs TBD with Daniel at seed time.

## Prerequisites (must land before schema work)

1. **Migration history.** Today: `drizzle-kit push` only — TS diffed against the
   live DB, no SQL artifact, no history, no rollback; `push-force` silently
   accepts destructive changes. We are adding ~8 tables and reshaping `posts`.
   Switch to generated migration files first. This is the amzsites divergence
   shape: two sources of truth, no enforcement.
2. **Object storage for images.** `uploads` and avatars write to local disk on
   prime and are wiped on redeploy. App icons/screenshots need R2. Video is
   already durable on Cloudflare Stream and is unaffected.

## Build order

| # | Spec | Why this order |
|---|---|---|
| 1 | **Catalog foundation** — apps, categories, modules, seed, browse + detail, link-out | Everything hangs off the app entity. Independently useful on landing. |
| 2 | **Incubator** — submission, voting, graduation | Needs apps to exist |
| 3 | **Ratings & reviews** | Needs graduated apps to rate |
| 4 | **Per-app video + feed re-point** | Reuses existing recordings pipeline |
| 5 | **GHL entitlements** | Only piece with an external dependency and a monthly bill |

Each gets its own spec → plan → implementation cycle.

Spec 4 also absorbs **School → per-app training**: `segments`/`subsections`/
`lessons` become courses attached to an app, rather than an orphaned section
next to the catalog. Only 2 lessons exist, so this is a repurpose, not a
migration.

## GHL integration (Spec 5 preview)

Model: **$0 SaaS Mode plan + rebilling for usage credits only** (SMS, email,
LLM). No subscription fee.

- Requires GHL **Agency Pro ($497/mo)** — SaaS Mode does not exist on lower
  tiers. Rebilling *with markup* is also Pro-only.
- Card is entered on **GHL's surface, into GHL's Stripe Connect**. It must never
  touch Baingers — a card form here pulls the community server into PCI DSS
  SAQ D scope for no benefit.
- GHL auto-provisions the sub-account on card success and pauses on failure.
- Baingers stores a thin **entitlement**: user → GHL location ID + status, kept
  in sync by GHL webhooks. Baingers holds a foreign key; GHL holds the billing,
  the card, and the risk.
- Disclosure: if wallet auto-recharge is enabled, state it plainly at signup.
  Opt-in usage credits are ordinary utility billing, not negative-option.

## Non-goals

- Hosting or executing user-submitted code
- Multi-tenancy (the schema is single-tenant by construction; retrofitting
  touches all 21 tables)
- SSO into AMG apps
- Embedding AMG apps via iframe
- Refactoring the existing `likes` / `post_reactions` redundancy (real, but
  unrelated to this goal)
