# Trust & safety

This product points cameras and gig-economy incentives at vulnerable people. If we get this page wrong, nothing else matters. These are product decisions, not legal boilerplate.

## Dignity policy (non-negotiable product rules)

1. **The stream is about the helper, not the recipient.** Default camera framing is the helper, the food, and the journey. The app's go-live UX literally says this.
2. **No filming recipients without on-the-spot consent.** No consent → camera down or pointed away during handout; the mission still completes and the helper is still paid. Delivery confirmation never requires a recipient's face.
3. **Face blur by default.** Bystanders and recipients in frame get automatic blurring on the recorded VOD (moderation pipeline); live-frame blur is a later milestone — until then, framing rules carry the weight and moderators can kill a stream.
4. **No "content farming" mechanics.** Ranking never rewards recipient-visible footage over helper-framed footage; no leaderboards of "most dramatic" anything. Cheers/tips attach to the act, not to the person receiving it.
5. **Recipients owe nothing.** No sign-up, no thank-you-on-camera expectation, no data collected about them, ever. There is deliberately no `recipients` table in the schema.

## Safe zones (the DOGS designation)

A mission can only terminate inside a **vetted safe zone** — a specific area DOGS has assessed. Lifecycle: `proposed` (anyone can suggest) → field-vetted by DOGS staff/partner orgs (local outreach groups get standing here) → `vetted` with active hours (e.g. daylight only) → periodically re-reviewed → `suspended` immediately on any incident. Vetting criteria include: outreach-org relationship in the area, lighting/visibility, no known territorial conflicts, legal to distribute food there (some cities restrict this — a per-city legal checklist gates zone activation).

The geofence is enforced server-side: the `delivering` checkpoint rejects a GPS fix outside the zone radius or outside active hours.

## Helper vetting

- Stripe Identity (government ID + selfie match) before first claim.
- DOGS approval step on top (manual for MVP — this is a feature, early helpers set culture).
- Onboarding module covering the dignity policy, de-escalation basics, and food-handling hygiene; short quiz gate.
- Strike system: dignity-policy violations kill the VOD, dock the mission, and strike the helper. Three strikes (or one severe) → deactivated, pending payouts still honored.

## Helper safety

- Active hours on zones double as helper-safety curfews.
- **Panic button** in the mission screen: one tap marks position, keeps streaming (footage = evidence), notifies DOGS on-call, and offers a 911 call.
- Missions are solo-optional: helpers can buddy up; both check in, fee is split by their choice.
- No helper personal info on stream: display name + first initial, live GPS never shown to viewers (the map on stream shows the zone, not the live pin, with a ~2 min delay).

## Content moderation pipeline

- **Live**: viewer reports + Workers AI frame sampling (every ~10s) feed a moderation queue; moderators can warn the helper (banner on their screen), force-blur, or kill the stream. Killing a stream ≠ failing the mission — a helper who did the work but framed it badly gets paid and coached.
- **Chat**: per-room rate limits in the StreamRoom DO, blocklist + AI toxicity scoring, shadow-mute first, room bans persisted. New accounts can cheer but not chat for the first N minutes (raid defense).
- **VOD**: nothing enters the public feed until the blur/moderation pass completes. Live is best-effort; recorded is guaranteed-reviewed.

## Abuse cases we design against (not exhaustive)

| Case | Control |
|---|---|
| Fake delivery (no handout) | Stream-required delivering state + spot-check reviews of VODs |
| Staged/exploitative "rescue" content | Framing rules + ranking neutrality + strikes |
| Doxxing a camp's location | Zones are already public-by-designation *and* coarse: streams show zone name, never precise pins; VOD holds until camp-identifying details reviewed |
| Harassment brigades in chat | New-account chat delay, room bans, per-IP Turnstile on account creation |
| Helper harassment of recipients | One-strike-severe deactivation; VOD is the evidence trail |
| Tip money-laundering | Velocity limits, Radar, payout holds on anomalies |

## Legal notes to resolve pre-launch (tracked, not solved here)

Food-donor liability (US: Bill Emerson Act cover for good-faith food donation), per-city food-sharing ordinances, gig-worker classification for helpers (1099 via Stripe Connect at MVP), minors (18+ for helpers; viewing is 13+ with chat off by default under 18), and state-by-state livestream consent laws (one-party vs two-party matters little for public-space video, but audio rules vary).
