# TASKS — sdm (prioritized)

Ordered by impact-per-effort. ⚡ = quick win (hours, not days).

## P0 — Do first

1. ⚡ **Decide: is "sdm" the public name?** Trademark screen + gut check
   on app-store viability. Everything brand-related blocks on this.
2. ⚡ **Write the brand voice guide.** DONE 2026-09-09 (`docs/VOICE.md`):
   tone principles, 16 sample lines (push notifications, empty states,
   match icebreakers, onboarding, error copy), do/don't table, and hard
   content lines so the app stays app-store-safe.
3. **Competitive scan.** 5 music/social dating apps: features, pricing,
   reviews, where they fail. One page of notes, not a thesis.

## P1 — Validate demand

4. **Landing page + waitlist.** SvelteKit + Tailwind on Cloudflare Pages,
   per the house stack. Pitch + email capture. (First real code in this
   repo.)
5. **Sonic fingerprint quiz.** 10-question music quiz → shareable result
   card. Lives on the landing page; doubles as the viral loop.
6. **Waitlist referral loop.** Invite-based queue jumping. Measure
   viral coefficient before writing app code.

## P2 — Build the MVP

7. **Scaffold the app.** SvelteKit app shell, auth, profile model.
8. **Music-first onboarding.** Questions before photos; self-declared
   sonic fingerprint.
9. **Vibe score v0.** Implement the matching sketch in CONCEPT.md §4:
   overlap + scene affinity + gig proximity, explainable output.
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
