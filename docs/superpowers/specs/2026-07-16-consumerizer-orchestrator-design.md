# Consumerizer — Orchestrator Design

**Date:** 2026-07-16
**Status:** Draft for review
**Purpose:** Evaluate each AMG internal app and emit a dev-team-ready build spec that converts it into a free, consumer-facing, bring-your-own-key (BYOK) product.

## What Daniel asked for

1. Evaluate every app we want to bring over.
2. Emit a full build prompt to the dev team, autonomously — no questions back.
3. Target state per app: user signs up, adds **their own** API key, uses it immediately.
4. Free — AMG does not pay per user.
5. Most apps get a URL, a marketing page, and Google sign-up.
6. **Strip every trace of Daniel's own keys, accounts, and usage.**
7. For everything stripped, ship a full guide on how the user gets their own (Facebook, Google, etc.).

## The severe one: the orchestrator's own output is a leak vector

The orchestrator's core job is finding credentials. That means it **reads secrets by design**, then writes documents describing what it found — documents that flow to the dev team, into Telegram, into logs, into git.

The obvious failure is an app shipping with Daniel's key still in it. The non-obvious one, and the likelier one, is **the orchestrator writing his live keys into its own spec files** while dutifully explaining which keys need removing.

`~/.claude/CLAUDE.md` alone holds live AWS, Anthropic, OpenAI, Stripe, Cloudflare, Namecheap, xAI, DeepSeek, Gemini, GHL, and Konnektive credentials. Any agent reading these repos will encounter them.

**Hard requirement — the Value Firewall:**

- The orchestrator emits secrets **by reference only**: `file:line`, env var name, key *type*. Never a value, never a prefix, never a last-4, never a "redacted" string that preserves length.
- Every generated artifact passes a secret scan **before** it is written or transmitted. A hit is a hard failure, not a warning.
- Known-value denylist built from `CLAUDE.md` + `/home/ubuntu/env/*.env`: any exact match in any output aborts the run.
- The orchestrator never has write access to a public surface. It writes specs. Humans and the dev team ship.

Without this, we have built a machine that harvests every credential Daniel owns and mails them to a chat bot.

## The three others

### "Free" is not what BYOK buys

BYOK covers per-user *API* cost. It does not cover hosting, databases, domains, egress, or any dependency without a user-level key. An app whose only external call is Anthropic can be genuinely free. An app that needs a Postgres database per user cannot — that is a real marginal cost per signup.

So evaluation must classify **every** dependency:

| Class | Meaning | Who pays |
|---|---|---|
| `byok` | User supplies their own key | User |
| `amg_pays` | No per-user key exists (hosting, DB, domain) | **AMG — per user, forever** |
| `tos_blocked` | Provider forbids this use | Nobody — app is not shippable |

**Deliverable per app: the true marginal cost of one signup.** Some apps will not be free. Daniel needs that number *before* the dev team builds, not after 500 people sign up.

### Google sign-up is blocked today, and Daniel's own notes prove it

`CLAUDE.md` records: *"Publish OAuth consent screen — until then refresh tokens auto-expire after 7 days."* That is Google's Testing-mode limit. Testing mode also caps at 100 users.

Every app that wants "Google sign-up option" needs a **verified** OAuth consent screen: privacy policy, terms, a homepage on a verified domain, and — for sensitive scopes — a security assessment and demo video. That is a Google review measured in weeks, not a config flag.

Same shape for Facebook: most permissions require App Review, a business verification, and a working demo.

This is not a per-app detail. It is a **program-level dependency** that gates the whole "consumer-facing" goal, and it should start now, in parallel with the builds, because it is the long pole.

### These apps are single-tenant, and that is a rewrite

Baingers was the tell: 21 tables, zero `tenant_id`, and a singleton `group_settings` config row. Retrofitting multi-tenancy touches every table and every query.

Assume the rest of the estate looks similar. "Add a key field to settings" is a config change. "Isolate every user's data from every other user's" is a rewrite, and if we get it wrong the failure is user A reading user B's data.

The evaluator must return an honest tenancy verdict and refuse to hand-wave it.

## Architecture

Six stages. Stages 2–4 fan out per app; stage 5 is a gate.

```
1 INVENTORY   → enumerate apps: repo, host, PM2 name, DB, stack, entry points
2 AUDIT       → per app, parallel:
                  a. secret scan      (gitleaks + AMG denylist)
                  b. dependency scan  (every outbound API)
                  c. tenancy analysis (is data user-scoped?)
                  d. AMG-coupling     (his accounts, domains, business logic)
3 CLASSIFY    → each dep → byok | amg_pays | tos_blocked
                → tenancy → ready | needs_scoping | rewrite
                → verdict → shippable | conditional | not_viable
4 GENERATE    → per app: removal list (by reference), BYOK onboarding,
                per-key "get your own" guide, marketing page, auth plan
5 FIREWALL    → scan every artifact. Any secret value = ABORT.
6 EMIT        → write spec to disk → human review → dev team
```

**Stage 5 is not optional and cannot be skipped by a flag.** It is the only thing standing between this pipeline and a credential disclosure.

### Stage 1 — Inventory

Sources: `pm2 jlist` on prime, `/home/ubuntu/env/*.env` filenames (names only — never values), GitHub repo list under `amg916`, `CLAUDE.md`'s service tables.

Output per app: slug, repo, host, port, DB URL **host only**, stack, entry point.

### Stage 2 — Audit (per app, parallel)

- **Secret scan** — `gitleaks detect` over the repo *and its git history* (a key removed in HEAD but alive in history is still a live key), plus exact-match search for every known AMG credential value. Output: `{file, line, key_name, key_type}` — **no values**.
- **Dependency scan** — every outbound host. Grep for SDK imports, `fetch`/`axios` targets, env var names matching `*_KEY|*_TOKEN|*_SECRET`.
- **Tenancy analysis** — does every user-data table carry a user/tenant FK? Does every query filter on it? Output: `ready | needs_scoping | rewrite` + the table list.
- **AMG-coupling** — hardcoded account IDs, `amgcc.space` domains, his Konnektive/Stripe/Meta account numbers, business logic that only makes sense for AMG.

### Stage 3 — Classify

Per dependency, resolve: does the provider issue per-user keys? Does its ToS permit a third party building on user-supplied keys?

Known constraints already on file:
- **NVIDIA NIM** — `CLAUDE.md`: *"eval/preview — NOT high-volume production"*; `nv-embed-v1` is non-commercial → `tos_blocked` for consumer use.
- **Konnektive** — IP-whitelist bound to a single proxy → cannot be BYOK'd → `tos_blocked`.
- **Google / Facebook** — BYOK-able, but gated on verification (above).
- **Anthropic / OpenAI / xAI / DeepSeek** — clean BYOK.

### Stage 4 — Generate

Per app, a spec containing:

1. **Removal manifest** — every secret and AMG-coupling by `file:line` + name. No values.
2. **BYOK onboarding** — signup → key entry → validate the key with a live test call → store encrypted → use. Key entry must be a *first-run gate*, not a settings page nobody finds.
3. **Key storage** — per-user, encrypted at rest, AES-256-GCM. Baingers' EmailWarmer already does this (`ENCRYPTION_KEY`, `<iv>:<ct>:<tag>`) — reuse the pattern rather than inventing one. Keys are never logged, never returned by any endpoint, never in an error message.
4. **"Get your own key" guide** — per provider, written for a non-developer: where to sign up, which product, exact scopes/permissions, cost, and what to paste. This is the thing that makes free actually work, and it is the piece most likely to be done badly.
5. **Consumer packaging** — domain, marketing page, Google auth (gated on verification), pricing statement ("free — you bring your keys").
6. **Tenancy work** — the honest rewrite estimate.
7. **Cost model** — marginal cost per signup, itemized.

### Stage 5 — Firewall

Every artifact from stage 4 is scanned before it lands. Denylist = exact values from `CLAUDE.md` + `/home/ubuntu/env/*.env` + `gitleaks` generic patterns. Any hit → abort, log the artifact's *path* and the *key name*, never the value.

### Stage 6 — Emit

Write to `docs/consumerizer/<app-slug>/build-spec.md`. Human reviews. Dev team builds.

**The orchestrator does not ship apps and does not talk to production.**

## Implementation

Fits the existing `Workflow` tool: a script fanning `pipeline()` over the app inventory, with stages 2a–2d as parallel agents per app and stage 5 as a hard gate before emit. Schema-validated agent output (the `schema:` option) keeps the audit results structured rather than prose.

Runs against **read-only clones**, never a live checkout on prime.

## Non-goals

- Building the apps (that is the dev team's job, from these specs)
- Shipping anything to production
- Deciding whether an app is worth converting — that is Daniel's call from the verdict
- Touching live credentials beyond detecting their presence

## Open questions for Daniel

1. **The app list.** "Bring down" which, exactly? The 11 in the catalog seed, or a different set?
2. **Non-free apps.** When stage 3 says an app costs $X/user/month, is that an automatic reject, or does he want to see it and decide?
3. **Google verification.** Start the consent-screen verification now as a program-level task? Nothing consumer-facing ships with Google auth until it is done.
