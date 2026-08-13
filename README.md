# help

**Pay people to help people.** A cross-platform app (iOS, Android, web) where donors fund small acts of direct aid, nearby vetted helpers carry them out — buy a pizza, drive it to a DOGS-designated safe zone, hand it out — and the whole run is livestreamed to a TikTok-style feed where viewers comment, cheer, and tip.

> ⚠️ **Repo note:** this project is meant to live at `yeahdogs/help`. The GitHub integration used to bootstrap it couldn't create org repositories, so it currently lives on the `claude/yeahdogs-help-app-arch-2niivh` branch of `yeahdogs/sdm`. Once someone with org admin rights creates `yeahdogs/help`, migrate with:
>
> ```sh
> git remote add help git@github.com:yeahdogs/help.git
> git push help claude/yeahdogs-help-app-arch-2niivh:main
> ```

## The $10 in one sentence

A donor gives **$10** → a nearby helper claims the mission, drives to the vendor (e.g. Little Caesars) and spends **$5** on a pizza → delivers it to a DOGS-vetted safe zone, live on stream → the helper earns **$4**, the vendor got **$5**, and DOGS keeps **$1** for hosting and operations.

## Monorepo layout

```
├── ARCHITECTURE.md          ← start here: full system design
├── docs/
│   ├── payments.md          ← money flow, ledger, Stripe integration
│   └── trust-and-safety.md  ← safe zones, dignity policy, moderation
├── packages/
│   └── shared/              ← types, mission state machine, money math (TS)
└── apps/
    ├── api/                 ← Cloudflare Worker (Hono) + Durable Objects + D1
    ├── web/                 ← React/Vite web app (Cloudflare Workers static assets)
    └── mobile/              ← Expo React Native app (iOS + Android)
```

Everything server-side runs on Cloudflare: Workers, D1, Durable Objects, R2, Queues, KV, Stream Live, Workers AI, Turnstile. See `ARCHITECTURE.md` for why each piece was chosen.

## Quickstart

```sh
npm install                  # installs shared, api, web workspaces
npm run typecheck            # typecheck all workspaces

npm run dev:api              # wrangler dev on http://localhost:8787
npm run dev:web              # vite dev server, proxies /v1 → api

cd apps/mobile && npm install && npx expo start   # mobile is a standalone workspace
```

First-time API setup (needs a Cloudflare account):

```sh
cd apps/api
npx wrangler d1 create help-db        # paste the id into wrangler.jsonc
npm run db:migrate:local              # apply migrations to the local D1
```

## Status

Greenfield scaffold. The API routes, D1 schema, Durable Object stream rooms, and the mission state machine are real and typechecked; Stripe and Cloudflare Stream calls are stubbed behind clearly-marked seams. The web and mobile apps are vertical-feed shells with mock data wired to the API's shapes.
