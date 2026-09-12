# CONCEPT — sdm

**Sex, Drugs, Music. A new dating app for the animals in the jungle.**

This is the concept brief. It answers: what is sdm, who is it for, and why
would anyone pick it over the dozen dating apps already on their phone?

> Note: sdm is brand-edgy on purpose, but the product itself must stay
> firmly app-store-safe. The name is rock-and-roll attitude; the actual
> content policies, age gating, and moderation are designed like any
> serious dating product (see "Safety & trust" below).

---

## 1. The idea in one paragraph

Most dating apps match you on photos and a bio nobody reads. sdm matches
you on the **soundtrack you live to**. Connect your listening (Spotify etc.)
or just answer the onboarding, and sdm builds your *sonic fingerprint*:
the genres you binge, the gigs you've been to, the scenes you run with.
Compatibility is a shared playlist, not a shared zip code. The jungle is
the city after dark — concerts, afterparties, late-night diners — and sdm
helps you find your pack.

## 2. Who it's for

- **Primary:** 21–34, music-obsessed, goes to shows, discovers people
  through scenes (local gigs, festivals, DJ nights, listening bars).
- **Secondary:** Creatives and nightlife workers — DJs, promoters, venue
  staff, photographers — who already socialize through music.
- **Anti-persona:** People who want a generic swipe app. sdm should
  actively repel "just here to swipe" energy; the onboarding asks about
  music before it asks for photos.

## 3. Differentiators (why not just use the others?)

1. **Sonic fingerprint > photo grid.** Match score is computed from
   listening overlap + gig overlap + scene overlap, shown as a "vibe
   score" with an actual shared playlist. Nobody else leads with this.
2. **Scene-based discovery.** "Who's going to the show Friday?" — event
   and venue-anchored matching turns the app into a social layer for
   nightlife, not just a chat box.
3. **Anti-swipe onboarding.** Music questions first, photos second. Sets
   the tone and filters the audience on day one.
4. **Jungle brand voice.** Edgy, funny, confident copy. Dating apps all
   sound like HR departments; sdm sounds like the afterparty.
5. **DOGS ecosystem tie-in.** The DOGS / wearedogs.net audience is a
   built-in seed community of exactly the right demographic.

## 4. Music-matching sketch (v0 algorithm)

This is a starting sketch, not a spec. Keep it explainable — users should
*feel* why they matched.

- **Inputs (user-provided or connected):** top artists, top tracks,
  top genres; gigs attended / RSVP'd (manual + ticket integrations later);
  self-declared scenes ("techno", "indie", "hip-hop", "metal"...).
- **Signals:**
  - *Overlap:* Jaccard-style similarity on top artists/tracks.
  - *Scene affinity:* shared scenes weighted by rarity (two techno heads
    in Tulsa is a stronger signal than two pop fans in LA).
  - *Gig proximity:* same upcoming shows / same venues = "you'll be in
    the same room Friday" boost.
  - *Taste depth:* long-tail overlap (obscure shared artists) scores
    higher than mainstream overlap.
- **Output:** a 0–100 **vibe score** + an auto-generated **"your overlap"**
  playlist + the top 3 shared artists shown on the match card.
- **Anti-gaming:** connected listening data outranks self-declared data;
  brand-new accounts with no history get a "fresh ears" provisional score.

## 5. Safety & trust (non-negotiable, designed from day zero)

Dating apps live or die on trust. These are product requirements, not
nice-to-haves:

- **18+ hard gate** with age verification before any matching or chat.
- **Photo verification** (selfie liveness check) before appearing in
  anyone's deck — kills most catfishing at the root.
- **Chat safety:** no image sharing until both sides opt in; harassment
  reporting with one tap; block = full disappearance.
- **Gig mode guardrails:** location sharing around events is
  opt-in, time-boxed, and never shows home/work locations.
- **Moderation:** automated flagging + human review queue; repeat
  offenders banned device-wide, not just account-wide.
- **Privacy:** listening data is used for matching only, never sold;
  delete-account = delete everything, provably.

## 6. Monetization sketch

- **Free core:** matching, vibe scores, chat. The network effect is the
  product — don't paywall it early.
- **Premium ("Backstage Pass"):** unlimited rewinds, see who's vibing
  with you, gig radar (alerts when a match RSVPs to the same show),
  profile boosts before big festival weekends.
- **Events revenue (later):** promoted shows, venue partnerships,
  presale access bundles. This is the long-term moat: sdm becomes the
  social layer of nightlife, and nightlife pays for distribution.

## 7. Tech direction

Follow the DOGS house stack — no reason to be the odd one out:

- **Frontend:** SvelteKit + Tailwind (matches the rest of the ecosystem).
- **Hosting:** Cloudflare Pages; media on R2.
- **Backend (later):** Cloudflare Workers + D1 or a small dedicated API;
  matching pipeline as a batch job, not realtime.
- **Music data:** start manual/self-declared (zero integration risk),
  add Spotify connection in phase 2, ticketing integrations in phase 3.

## 8. Open questions

- Trademark clearance on "sdm" / "Sex, Drugs, Music" in the dating/social
  category — check before spending on brand assets.
- App Store / Play dating-category policies and required age-rating
  disclosures — review before any beta ships.
- Is "sdm" the public name, or a working title with a cleaner public
  brand? Decide before the landing page goes live.
- Seed market: one city first (Tulsa? OKC? Austin?) — dating apps need
  local density to feel alive.
