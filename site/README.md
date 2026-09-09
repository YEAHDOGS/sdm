# sdm — waitlist landing page (`site/`)

First real code in the repo: a SvelteKit + Tailwind v4 landing page per the
house stack, implementing TASKS.md P1 #4 (landing page + waitlist).

## What's here

- `src/routes/+page.svelte` — hero, differentiators, how-it-works, safety
  strip, and the waitlist section. Copy follows `docs/VOICE.md`.
- `src/lib/WaitlistForm.svelte` — email + city + scene-tag form. Validates
  client-side with `src/lib/waitlist.js`, POSTs to `/api/waitlist`.
- `src/lib/waitlist.js` — pure, framework-free signup validation/normalize
  logic shared by the form and the endpoint.
- `src/routes/api/waitlist/+server.js` — **stub endpoint.** Validates and
  answers 202, persists nothing. Must be wired to a real store before launch.
- `tests/waitlist.test.js` — 11 regression tests, run with plain node
  (`npm test` / `node --test 'tests/*.test.js'`), no install needed.
- Adapter: `@sveltejs/adapter-static` (Cloudflare Pages-ready static build).

## Run it (needs a networked machine — this sandbox is default-deny)

```sh
cd site
npm install          # installs Svelte 5 / SvelteKit 2 / Tailwind v4 — NOT run here
npm run dev          # http://localhost:5173
npm test             # waitlist logic regression tests
npm run check        # svelte-check
npm run build        # static output in build/
```

Note: `package.json` version ranges were scaffolded from known-stable
releases (Svelte ^5, SvelteKit ^2, Tailwind ^4, Vite ^6). On first install,
confirm the resolved versions still play well together.

## Before any public deploy

1. Wire `/api/waitlist` to a real store (D1/KV) + add rate limiting.
2. P0 #1 decision: is "sdm" the public name? Trademark screen first.
3. Privacy copy review against CONCEPT.md §5 (listening data never sold).
