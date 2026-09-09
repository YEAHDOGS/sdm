# sdm

**Sex, Drugs, Music** — a new dating app for the animals in the jungle.

> A music-first dating app. Swipe less, vibe more: match people by the
> soundtrack they actually live to — gigs they go to, tracks they can't stop
> replaying, scenes they run with. The jungle is the city at night; find your
> pack.

## Why this wins

Every dating app is a photo grid with a filter slider. Nobody is matching
people on *taste* — the thing that actually decides who you'd cross town
for at 1am. sdm's whole thesis:

- 🎵 **Music-first matching** — compatibility from listening overlap, gig
  history, and genre scenes, not selfies. The match card shows the
  *playlist that proves it*, not a compatibility horoscope.
- 🌃 **Jungle brand** — a real voice, not a vibe template. The city after
  dark is a jungle and you're looking for your pack. (Brand guide in
  `docs/VOICE.md` — app-store-safe by design.)
- 🛡️ **Trust is the feature** — 18+ hard gate, photo verification before
  you hit the deck, listening data never sold, full delete that actually
  deletes. Dating apps have a trust crisis; sdm answers it up front.

## What's actually built

This is past concept stage — `site/` is a working SvelteKit 5 + Tailwind v4
static app, and the matching engine is real, tested code:

- **Landing page** (`site/src/routes/+page.svelte`) — hero, pillars,
  how-it-works, safety strip, waitlist form. Copy follows the brand voice.
- **Sonic-fingerprint quiz** (`site/src/lib/quiz.js` + `QuizVibe.svelte`) —
  10 questions across 4 axes (heat / grit / depth / nocturne), 7 jungle
  archetypes, shareable result card. Interactive and live on the page.
- **Vibe-score matching engine** (`site/src/lib/vibe.js`) — weighted
  Jaccard overlap on artists/tracks/genres, long-tail taste-depth bonus,
  rarity-weighted scene affinity, gig proximity boost, explainable
  `reasons[]`, "fresh ears" provisional flag. The quiz UI scores matches
  through the same engine the app will run on.
- **Waitlist plumbing** (`site/src/lib/waitlist.js` + API route) — shared
  validation/normalize logic, 202 stub endpoint. **Stub: persists nothing.**
  Needs a real store (D1/KV) + rate limiting before launch.
- **54 regression tests**, runnable with zero dependencies:
  `cd site && npm test` (plain `node --test`).

## Run it

```sh
cd site
npm install     # Svelte 5 / SvelteKit 2 / Tailwind v4 (needs a networked machine)
npm run dev     # http://localhost:5173
npm test        # 54 regression tests, no install needed
npm run check   # svelte-check
npm run build   # static output in build/ — Cloudflare Pages-ready (adapter-static)
```

Sandbox note: this repo was built under a default-deny network policy, so
`npm install` / `npm run build` can't be verified here — `npm test` is the
green baseline that runs anywhere.

## What's next (the honest list)

| Area | State |
|------|-------|
| Brand / concept | Drafted (`docs/CONCEPT.md`) |
| Competitive scan | Done — 5 music/social dating apps (`docs/COMPETITIVE-SCAN.md`) |
| Roadmap | Drafted (`docs/ROADMAP.md`) |
| Task list | Drafted + tracked (`docs/TASKS.md`) |
| Landing page + waitlist | Shipped in `site/`, 2026-09-09 |
| Quiz + vibe engine + UI | Shipped in `site/`, 2026-09-09 |
| Backend / matching API | Not started |
| Waitlist persistence | **Stub — not shippable as-is** |
| Legal / safety review | Not started — required before any beta |

## Docs

- [`docs/CONCEPT.md`](docs/CONCEPT.md) — brand, audience, differentiators,
  music-matching sketch, safety & moderation design, monetization.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased path from concept → beta.
- [`docs/TASKS.md`](docs/TASKS.md) — prioritized build task list.
- [`docs/VOICE.md`](docs/VOICE.md) — brand voice guide: tone principles,
  sample copy for notifications/empty states/match messages, and hard
  content lines (app-store-safe by design).
- [`docs/COMPETITIVE-SCAN.md`](docs/COMPETITIVE-SCAN.md) — 5 comparable apps.
- [`site/README.md`](site/README.md) — engineering notes for the site build.

## Before any public deploy

1. Wire `/api/waitlist` to a real store (D1/KV) + add rate limiting.
2. P0 #1 decision: is "sdm" the public name? Trademark screen first.
3. Privacy copy review against CONCEPT.md §5 (listening data never sold).

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 DOGS.
