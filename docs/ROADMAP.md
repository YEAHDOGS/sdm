# ROADMAP — sdm

Phased path from concept to beta. Each phase has an exit criterion — don't
start the next phase until the current one's is met.

## Phase 0 — Concept lock (now → ~2 weeks)

- [ ] Trademark/name screen: is "sdm" clearable, and is it the public
      name or a working title? (see CONCEPT.md open questions)
- [ ] One-paragraph pitch + brand voice guide (3–5 sample lines of copy
      in the jungle voice).
- [ ] Competitive scan: 5 music-adjacent dating/social apps — what they
      do, where they whiff, what sdm steals.
- [ ] Seed-market decision: pick ONE city for the eventual beta.
- **Exit:** name decision made, pitch fits on an index card.

## Phase 1 — Landing page + waitlist (2–4 weeks)

- [ ] Scaffold SvelteKit + Tailwind on the house setup; deploy to
      Cloudflare Pages.
- [ ] Landing page: the pitch, the vibe, email/SMS waitlist capture.
- [ ] "Sonic fingerprint" quiz prototype on the landing page (10 music
      questions → shareable result card). This doubles as marketing.
- [ ] Waitlist referral loop: invite friends, move up the list.
- **Exit:** landing page live, 500+ waitlist signups in the seed city.

## Phase 2 — MVP prototype (1–2 months)

- [ ] Auth + profiles (music-first onboarding: questions before photos).
- [ ] Manual sonic fingerprint (self-declared artists/genres/scenes).
- [ ] Vibe score v0 (see CONCEPT.md §4) + match deck + chat.
- [ ] Safety baseline: 18+ gate, reporting, blocking.
- [ ] Closed alpha: 50–100 users from the waitlist, all in the seed city.
- **Exit:** 100 alpha users, 20%+ week-2 retention, zero safety incidents
  unhandled >24h.

## Phase 3 — Beta hardening (2–3 months)

- [ ] Spotify connection (verified listening data > self-declared).
- [ ] Photo verification (liveness check) before deck visibility.
- [ ] Gig radar v0: manual event listings + "going" RSVPs + match
      proximity boost.
- [ ] Moderation pipeline: automated flags + human review queue.
- [ ] Legal: terms, privacy policy (listening-data use spelled out),
      age-verification flow reviewed.
- [ ] "Backstage Pass" premium tier v0.
- **Exit:** 1,000+ beta users in seed city, moderation SLA met, unit
  economics sketched.

## Phase 4 — Launch & scenes (3–6 months)

- [ ] Public launch in seed city, timed to a festival or big gig weekend.
- [ ] Venue/promoter partnerships: presale bundles, official afterparties.
- [ ] Ticketing integrations for automatic gig history.
- [ ] City #2 only after seed city hits real density (rule of thumb:
      matches-per-user-per-week > 5).
- **Exit:** sustainable growth loop in 2+ cities, premium conversion
  measured, safety record clean.

## Non-goals (for now)

- Realtime matching engine — batch is fine until scale demands otherwise.
- Native apps — PWA first; native only when retention justifies it.
- International — one seed city, then one country, then the world.
