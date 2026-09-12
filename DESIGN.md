# SDM: DESIGN.md v6 (2026-09-12)

v6 polish: zero em-dashes, CSS scroll-driven parallax (no JS scroll listener),
rose CTA for 4.5:1 contrast, scroll-cue icon removed, footer separator rationed,
badge-image attribution. Earlier: v5 = codename line dropped from footer;
v4 = happy medium v2 snap panels + short punchy lines (2 per panel)
+ asymmetric placement (top / bottom / right / mid, nothing forced center)
+ parallax bg drift + staggered clip reveals on entry.

The house style, learned from wearedogs.net: full-screen Y-scroll-snap panels,
one giant idea per screen, almost no text. Images carry the weight.

## Layout: snap panels
- `html { scroll-snap-type: y mandatory }`, every panel `100svh` / `100dvh`,
  `scroll-snap-align: start`, `scroll-snap-stop: always`.
- Panel order: SEX. / DRUGS. / MUSIC. / TALK FIRST. / GET IN. / outro.
- No fixed nav chrome. No cards. No sections-with-paragraphs.

## Type
- Display: Righteous, uppercase, `clamp(88px, 26vw, 300px)`, one word per panel.
- Microcopy: Poppins 500, 12px, 0.22em letterspacing, uppercase, muted.
- Total visible words on the page: under 120.

## Color
- `--bg #07090b` jungle black · `--ink #f5efe4` bone · `--rose #e11d48` ·
  `--amber #f0a53c` · `--mut #9aa39b`
- One accent color per panel: rose / amber / bone / rose+amber / bone / dim.

## Imagery
- `img/panel-sex.jpg` : rose jungle mist (AI-generated, dark)
- `img/panel-drugs.jpg` : amber smoke (AI-generated, dark)
- `img/panel-music.jpg` : vinyl grooves macro (AI-generated, dark)
- Full-bleed `object-fit: cover` with gradient scrim for legibility.
- Panel 4: canvas equalizer (rose→amber), pauses offscreen / reduced-motion.

## Motion
- Subtle rise-in on panel entry (IntersectionObserver, once).
- No scroll cue, no pinned nav. Nothing blocks input.

## Waitlist
- Single email field + arrow button, localStorage only, honest copy.
- No fake backend claims.

## Rules
- 18+ tag top-left of panel 1; "18+ only" in outro.
- Attribution: "This product was made by DOGS" → https://wearedogs.net.
- SDM stays the codename in the footer until real name lands.
