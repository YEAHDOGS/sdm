# SDM — Sex · Drugs · Music

**A dating app for the animals in the jungle, by [DOGS](https://wearedogs.net).**

SDM is an ID-verified place to find new friends and partners based on sexual
preferences, music taste, and recreational vices. Matching draws on BDSM and
personality tests, porn preferences, astrology, deep Spotify/Apple Music
integration, and drug preferences — then gets out of the way. Less swiping,
more talking: random text/voice/video chat, chatrooms, and a short daily
batch of good matches instead of an infinite deck. AI keeps spam and bots
out; every account is backed by a valid US ID.

**Status:** building. Landing page is live at
[sdm.wearedogs.net](https://sdm.wearedogs.net); more information estimated
2027.

## Principles

- **Verified, 18+, US-only.** Every account passes government-ID + liveness
  verification before it can talk to anyone. We store attestations, never ID
  documents.
- **Wild, not reckless.** Privacy and consent tooling designed in from the
  first commit: encrypted preference vault, per-field visibility,
  consent-gated media, real deletion.
- **Anonymous by default.** Handles, age ranges, distance buckets — nothing
  in-product links an SDM identity to a legal one.
- **No dark patterns.** Premium sells capacity and control (more matches,
  better filters, priority queues) — never outcomes. No pay-per-match, no
  "see who likes you" ransom.

## Architecture at a glance

The full system design lives in **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** —
domains, data model, security posture, cost analysis, and build phases.
The headlines:

| | |
| --- | --- |
| Clients | iOS + Android via **React Native/Expo**, web via **Next.js** — one TypeScript monorepo, shared `core`/`ui`/`api-client` packages (Tamagui), ~80–90% code reuse |
| Backend | **Serverless-first on Cloudflare**: Workers (modular monolith) + Durable Objects (chat, presence, matchmaking) + Queues/Cron |
| Voice/video | Managed WebRTC SFU (Cloudflare Realtime or LiveKit Cloud) |
| Data | Neon serverless Postgres + pgvector via Hyperdrive · R2 media (zero egress) · Workers KV |
| Identity | Third-party IDV (Persona / Stripe Identity) — attestations only, no ID storage |
| Payments | **Stripe** (web) + StoreKit / Play Billing (mobile), unified by RevenueCat behind an entitlements module |
| AI | Claude API for nuanced moderation and anti-bot, Workers AI for high-volume classifiers |

Why this shape: a dating app is almost entirely serverless-able — the two
exceptions (persistent chat connections, WebRTC media routing) are covered
by Durable Objects and a managed SFU respectively. Cloudflare wins on cost
for a realtime + media app at our stage: ~$5/mo idle floor and zero egress
fees, versus a $50–150/mo floor plus ~$0.09/GB egress elsewhere.

## Repository layout

```
landing/   Static landing page (GitHub Pages → sdm.wearedogs.net)
docs/      Architecture and design docs
.github/   CI — landing page deploy workflow
```

The application monorepo (`apps/mobile`, `apps/web`, `packages/*`) lands as
the build progresses — see the
[build phases](./docs/ARCHITECTURE.md#6-build-phases).

## Roadmap

| | |
| --- | --- |
| 2025 | Idea — done |
| 2026 | Repo live, architecture laid out, building — **in progress** |
| 2027 | More information |

## License

[MIT](./LICENSE) — this product was made by DOGS.
