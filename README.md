# sdm

**Sex, Drugs, Music** — a new dating app for the animals in the jungle.

> A music-first dating app. Swipe less, vibe more: match people by the
> soundtrack they actually live to — gigs they go to, tracks they can't stop
> replaying, scenes they run with. The jungle is the city at night; find your
> pack.

## What is this?

`sdm` is a **concept-stage** YEAHDOGS app skeleton. Right now it is an idea
with a brand and a tagline — no code yet. The goal: a dating app that
differentiates on music taste and real-world scenes instead of generic
photo-swipe mechanics.

- 🎵 **Music-first matching** — compatibility built from listening habits,
  gig history, and genre scenes, not just selfies.
- 🌃 **Jungle framing** — the app's brand voice: the city after dark is a
  jungle, and you're looking for your pack.
- 📱 **House stack** — when scaffolded, it should follow the DOGS
  ecosystem stack (SvelteKit / Vite / Tailwind, Cloudflare Pages + R2), not
  Next.js (the old `.gitignore` template was retargeted accordingly).

## Core mechanic — Live (decided 2026-10-15)

**Presence-only swiping.** You can only swipe on people who are active
right now. The deck is whoever is online this moment — log in and you're
in the pool; log off and you vanish. No dormant profiles, ever.

It feels like a live chat room, not a database: incoming likes pop up in
real time while you swipe, and a match can go straight to talking because
both people are still there. One line: **nobody here is asleep.**

Design implications when this gets built:
- Presence heartbeat gates deck visibility; the deck is the online set,
  not a ranked list of everyone who ever signed up.
- Likes are pushed live (WebSocket), never batched into a later digest.
- Match → chat opens immediately, while both sides are still present.

## Status

| Area | State |
|------|-------|
| Brand / concept | Drafted (`docs/CONCEPT.md`) |
| Roadmap | Drafted (`docs/ROADMAP.md`) |
| Task list | Drafted (`docs/TASKS.md`) |
| Prototype | Not started |
| Backend / matching | Not started |
| Legal / safety review | Not started — required before any beta |

## Docs

- [`docs/CONCEPT.md`](docs/CONCEPT.md) — brand, audience, differentiators,
  music-matching sketch, safety & moderation design, monetization.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased path from concept → beta.
- [`docs/TASKS.md`](docs/TASKS.md) — prioritized build task list.

## Getting started (when there's code)

Nothing to run yet. First engineering step is tracked in
[`docs/TASKS.md`](docs/TASKS.md): scaffold a SvelteKit app with the house
Tailwind setup and a landing page that pitches the concept.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 DOGS.
