# WAITLIST — status and constraint

> **HOLD (2026-09-09): do not build a waitlist for sdm yet.**

The founder's standing decision: **one shared waitlist across all DOGS
projects**, built on Cloudflare. That design is **not settled** — do not
build or deploy any waitlist (standalone or shared) until Brando confirms
the design.

## What this means for sdm's plans

The waitlist items in [`ROADMAP.md`](ROADMAP.md) (Phase 1 — landing page;
waitlist capture and referral loop, both marked on hold) and
[`TASKS.md`](TASKS.md) (items 4 and 6)
are **pending**, not approved work. They were written before the shared
waitlist decision and currently read as a standalone sdm waitlist with
email/SMS capture and an invite-based referral loop. That conflicts with
the shared-waitlist direction and would be throwaway work.

## Gate before any waitlist code

1. Brando confirms the shared waitlist design.
2. The shared design lands (repo, endpoint, data model) — link it here.
3. Only then can sdm wire its landing page into it. A per-project
   waitlist build is explicitly out of scope.

## Honesty check

There is no waitlist code on `master` — everything is a plan. The
scaffold on branch `jack/sdm-sweep2` (2026-09-09) includes an explicitly
stubbed waitlist endpoint (`site/src/routes/api/waitlist/+server.js` —
"STUB ENDPOINT — placeholder only, do NOT launch against this"; answers
202 without persisting) and a `WaitlistForm.svelte` that posts to it.
That stub is **honestly labeled** and not deployed anywhere. Keep it that
way until the gate above clears. If a demo, mock, or copy mentions a
waitlist, label it `stub / pending shared design` so nobody mistakes it
for working capture.
