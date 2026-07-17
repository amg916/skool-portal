# Consumer Edition — the FORK model

**Date:** 2026-07-17
**Status:** Directive for the dev team / Consumerizer
**Supersedes:** the in-place "removal manifest" framing in the Consumerizer specs

## The correction

The Consumerizer's specs assume **in-place consumerization** — "strip Daniel's keys out of *the* app, add BYOK, add tenancy." That is the wrong and dangerous model. It puts live revenue-generating apps, holding real customer data, on the operating table.

**The actual model: a Consumer Edition is a separate FORK.**

> Same core premise. Empty shell. New repo, new brand, new domain, new database.
> **The live app is never modified, never redeployed, never touched.**

## Hard rules

1. **PRODUCTION IS UNTOUCHABLE.** Never modify, redeploy, or migrate a live AMG app. No PRs against the live repo, no changes to its PM2 process, DNS, or DB. If a task seems to require touching prod, stop and report instead.
2. **Fork, don't convert.** New repo `<brand>-consumer`, new domain, new database. Copy the code, not the data.
3. **The fork starts EMPTY.** Zero AMG rows are ever copied — no customers, orders, offers, leads, campaigns, or brand records. Ship a small synthetic demo seed instead.
4. **Strip everything AMG.** All AMG API keys, account IDs, `amgcc.space` hosts, brand names (Malibu, OSOM, MortgageCo, NAD, Smile Optics…), business-specific logic, and internal integrations. Keep only the generic mechanic.
5. **Rebrand — no competitor trademarks.** The fork needs its OWN name.
   - ❌ **Omnisend** (omnisend.com is a real company — AMG is a paying customer), **TrackDrive** (trackdrive.com), **Lead Prosper** (leadprosper.io), **Everflow**.
   - ✅ **Reach**, **Stint** — own names, correct pattern. Follow it.
6. **Multi-tenant from line one.** Build it in the fork, don't retrofit: users table, `user_id`/`tenant_id` FK on every data row, a tenant filter on EVERY query, and an automated test proving user A cannot read user B's data. This is far safer in a fork — a mistake can't leak AMG data, because the fork has none.
7. **BYOK first-run gate.** Signup → immediately gated on the user pasting their own API key(s) → validate with a live test call → store encrypted (AES-256-GCM, `<iv>:<ct>:<tag>`, per-user) → use. Never a settings page nobody finds. Keys never logged, never returned by any endpoint, never in an error message.
8. **Subscription fleet for AMG's own LLM use; BYOK for the consumer.** Never a paid API key for AMG operation. The consumer's own key is the only permitted paid path.
9. **A "get your own key" guide per provider,** written for a non-developer: where to sign up, which product, exact scopes, cost, what to paste. This is what makes "free" actually work.

## Verdict correction

The Consumerizer currently marks apps **SHIPPABLE** while their own tenancy section reads *"NEEDS_SCOPING — multi-tenant isolation is unproven."* That is wrong: unproven isolation on an app holding customer records is the gap between a launch and a breach.

**Under the fork model, tenancy is a build requirement, not a blocker** — but a fork is only shippable once an automated cross-tenant isolation test passes. Never label an app shippable while isolation is unproven.

## Candidate order (first fork proves the pattern)

Best first candidates — clearest standalone premise, least AMG entanglement:

| Source | Consumer edition | Premise |
|---|---|---|
| `omnisend.amgcc.space` (branded **Reach**) | **Reach** (rename the slug off "omnisend") | Marketing automation: push + email + SMS |
| `stint.cc` | **Stint** (already own-branded) | Affiliate tracking: offers, partners, postbacks |
| `crm.amgcc.space` | *needs a name* | CRM: contacts, orders, pipeline |
| `truinvoice.amgcc.space` | *needs a name* | Invoice + payment links |
| `textbee.amgcc.space` | *needs a name* | Android phone as an SMS gateway (upstream is OSS: github.com/vernu/textbee) |

**Do ONE first, end to end, and verify it** before fanning out. A proven pattern beats 20 half-built forks.

## Not consumer products (internal denylist — never fork or list)

`ecom`, `ach-pro` (BofA refunds), `tg-ops` (automation control), `sic` (SEC filings), `amazon` (seller data). Plus **All Customer Service** as it exists today is AMG's own billing/refund desk holding AMG customer records — a *fork* of the support-desk mechanic is a fine product, but the live instance is an ops surface, not a product.
