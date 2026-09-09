# TASKS — sdm (prioritized)

Ordered by impact-per-effort. ⚡ = quick win (hours, not days).

## P0 — Do first

1. ⚡ **Decide: is "sdm" the public name?** Trademark screen + gut check
   on app-store viability. Everything brand-related blocks on this.
2. ⚡ **Write the brand voice guide.** DONE 2026-09-09 (`docs/VOICE.md`):
   tone principles, 16 sample lines (push notifications, empty states,
   match icebreakers, onboarding, error copy), do/don't table, and hard
   content lines so the app stays app-store-safe.
3. **Competitive scan.** DONE 2026-09-09 (`docs/COMPETITIVE-SCAN.md`):
   5 apps (Tastebuds, Vinylly, POM, Kippo, Feeld) — features, pricing,
   traction signals, where they fail. Key takeaways: density kills
   incumbents (seed-city launch is the counter), passive Spotify data
   beats self-declared taste, don't paywall messaging, Gig Radar is the
   sharpest wedge, $9.99/mo price anchor for Backstage Pass.

## P1 — Validate demand

4. **Landing page + waitlist.** SCAFFOLDED 2026-09-09 in `site/`:
   SvelteKit 5 + Tailwind v4 (adapter-static, Cloudflare Pages-ready),
   hero/how-it-works/safety sections per `docs/VOICE.md`, waitlist form
   (email + city + scene tags) with client validation, `/api/waitlist`
   endpoint. STUB: endpoint answers 202 but persists nothing — must be
   wired to a real store (D1/KV) + rate-limited before launch. NOT
   build-verified here: `npm install` needs network (this machine is
   default-deny); build/check/tests (except `npm test`) must run on a
   networked machine before deploy.
5. **Sonic fingerprint quiz.** 10-question music quiz → shareable result
   card. Lives on the landing page; doubles as the viral loop. DONE
   2026-09-09 — LOGIC (`site/src/lib/quiz.js`, +10 regression tests) +
   Svelte UI (`site/src/lib/QuizVibe.svelte`, mounted on `+page.svelte` #quiz
   section) + pure glue module (`site/src/lib/quizVibe.js`) that feeds quiz
   answers into the vibe engine (`vibe.js`) and renders top pack matches
   live with their explainable `reasons[]` (+14 wiring tests; 54/54 green).
   NOTE: the Svelte component itself is NOT build-verified here — `npm install`
   needs network (default-deny); `npm run check` / `npm run build` must run
   on a networked machine before deploy.
6. **Waitlist referral loop.** Invite-based queue jumping. DONE 2026-09-09 —
   LOGIC (`site/src/lib/referral.js`, +20 regression tests, 74/74 green):
   unambiguous referral-code generation/validation, share-link builder +
   `?ref=` parser, bounded queue-jump ranking (`rankQueue`: 3 places per
   verified referral, capped at 25), `viralStats` k-factor/conversion math,
   on-voice share copy. `/api/waitlist` now hands every signup a
   `referralCode` and accepts/validates `referredBy`. NOTE: the store still
   doesn't exist (P1 #4 stub) — referral crediting must land with the real
   persistence layer (new-email-only, no self-referrals). Analytics layer DONE 2026-09-09:
   `site/src/lib/analytics.js` (+15 regression tests, 89/89 green) — k-factor over daily/weekly
   windows, invite→join→activated conversion funnel, leaderboard logic with anti-gaming guards
   (self-referral rejected from credit; shared-IP/device and aliased-duplicate-email joins
   flagged-not-dropped, excluded from the trusted score the board ranks by) — POST
   `site/src/routes/api/referral/analytics` (event batch → summary) +
   `site/scripts/referral-analytics.mjs` CLI. UI surface DONE 2026-09-09:
   `?ref=` captured on form mount and sent as `referredBy` (+ invited-by
   banner), new `site/src/lib/ReferralPanel.svelte` share panel after signup —
   invite code, share link, suggested message, copy buttons w/ manual fallback,
   jump-math explainer (3 spots/referral, max 25) — code persisted to
   localStorage so returning browsers land back on their panel. NO fake queue
   position: the waitlist store still doesn't exist (P1 #4 stub), so position
   display waits on the real persistence layer with it. `npm run check` /
   `npm run build` still must run on a networked machine before deploy
   (new `site/scripts/svelte-smoke.mjs` covers balance + import resolution
   offline).

## P2 — Build the MVP

7. **Scaffold the app.** SvelteKit app shell, auth, profile model.
8. **Music-first onboarding.** Questions before photos; self-declared
   sonic fingerprint.
9. **Vibe score v0.** DONE 2026-09-09 in `site/src/lib/vibe.js` (+19
   regression tests): weighted Jaccard overlap on artists/tracks/genres,
   long-tail taste-depth bonus, rarity-weighted scene affinity, gig
   proximity ("same room Friday" boost), opt-in sonic-fingerprint alignment
   (ties into the P1 #5 quiz engine), explainable `reasons[]`, and a
   "fresh ears" provisional flag for thin profiles. Anti-gaming note: when
   connected listening data lands (P3 #12), it should outrank declared
   data here.
10. **Match deck + chat.** Keep it minimal: cards, vibe score, shared
    playlist preview, chat.
11. **Safety baseline.** 18+ gate, report, block. Ship with the MVP, not
    after.

## P3 — Harden for beta

12. **Spotify integration.** Verified listening data outranks
    self-declared.
13. **Photo verification.** Liveness check before deck visibility.
14. **Gig radar v0.** Manual event listings, RSVPs, same-show match boost.
15. **Moderation pipeline.** Auto-flags + human review queue + SLAs.
16. **Legal pack.** Terms, privacy policy, age-verification review.

## P4 — Launch

17. **Seed-city launch.** Timed to a festival/gig weekend; venue and
    promoter partnerships.
18. **Backstage Pass premium.** Paid tier: rewinds, see-your-admirers,
    gig radar alerts, boosts.
19. **City #2.** Only when seed city hits density targets.

## Hygiene (ongoing)

- ⚡ Keep `.gitignore` matched to the actual stack (done — retargeted
  from Next.js to SvelteKit/Vite).
- Decide commit/PR conventions for this repo once code lands (org
  default is free-push for YEAHDOGS; keep it that way until it hurts).
- Every phase-gate metric from ROADMAP.md gets a tracking note here
  when measured.
