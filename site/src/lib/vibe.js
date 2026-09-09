/**
 * Vibe score v0 — the music-first matching engine (CONCEPT.md §4, TASKS.md P2 #9).
 *
 * Pure module — zero framework dependencies — so it can power the match
 * deck AND be unit-tested with plain `node --test` (no install).
 *
 * Signals, all explainable ("users should *feel* why they matched"):
 *  - Overlap: weighted Jaccard similarity on top artists / tracks / genres.
 *  - Taste depth: shared long-tail artists (low popularity) score a bonus.
 *  - Scene affinity: shared scenes weighted by rarity (two techno heads in
 *    Tulsa > two pop fans in LA).
 *  - Gig proximity: same upcoming shows / venues = "you'll be in the same
 *    room Friday" boost.
 *  - Fingerprint alignment: if both users took the sonic fingerprint quiz
 *    (src/lib/quiz.js), cosine similarity of their 4-axis vectors nudges
 *    the score. Quiz data is opt-in; its absence never penalizes.
 * Anti-gaming note: declared taste is all we have at this stage — when
 * connected listening data lands (Spotify, P3 #12) it should outrank
 * declared data here. Brand-new accounts get a "fresh ears" provisional
 * flag instead of a fake-confident score.
 */

export const WEIGHTS = Object.freeze({
  artists: 30,
  tracks: 15,
  genres: 15,
  scenes: 20,
  gigs: 15,
  fingerprint: 5
});

/** Total weight — the score ceiling. */
export const MAX_SCORE = Object.freeze(
  Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
);

/** Popularity under this is "long-tail": shared obscurity counts extra. */
export const LONG_TAIL_MAX_POPULARITY = 40;
export const LONG_TAIL_BONUS = 0.5;

/** Fewer taste items than this per profile -> "fresh ears" provisional. */
export const FRESH_EARS_MIN_ITEMS = 3;

function normName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Weighted Jaccard similarity between two name lists.
 * @param {Map<string, number>} weightsA normalized-name -> weight map
 * @param {Map<string, number>} weightsB normalized-name -> weight map
 * @returns {number} 0..1
 */
function weightedJaccard(weightsA, weightsB) {
  if (weightsA.size === 0 || weightsB.size === 0) return 0;
  const keys = new Set([...weightsA.keys(), ...weightsB.keys()]);
  let inter = 0;
  let union = 0;
  for (const k of keys) {
    const a = weightsA.get(k) ?? 0;
    const b = weightsB.get(k) ?? 0;
    inter += Math.min(a, b);
    union += Math.max(a, b);
  }
  return union === 0 ? 0 : inter / union;
}

function nameWeightMap(items) {
  const m = new Map();
  for (const item of items) {
    const name = typeof item === 'string' ? item : item?.name;
    const key = normName(name);
    if (!key) continue;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

function artistWeightMap(artists) {
  const m = new Map();
  for (const a of artists) {
    const key = normName(typeof a === 'string' ? a : a?.name);
    if (!key) continue;
    const popularity = typeof a === 'object' && a !== null && typeof a.popularity === 'number'
      ? clamp(a.popularity, 0, 100)
      : 100; // unknown popularity: assume mainstream, no long-tail bonus
    const weight = popularity < LONG_TAIL_MAX_POPULARITY ? 1 + LONG_TAIL_BONUS : 1;
    m.set(key, Math.max(m.get(key) ?? 0, weight));
  }
  return m;
}

/**
 * Scene component: shared scenes weighted by rarity.
 * Each scene: { name, rarity } with rarity 0..1 (1 = rarest).
 * @returns {{ points: number, shared: string[] }}
 */
function sceneComponent(scenesA, scenesB) {
  const mapA = new Map();
  for (const s of scenesA) {
    const key = normName(typeof s === 'string' ? s : s?.name);
    if (!key) continue;
    const rarity = typeof s === 'object' && s !== null && typeof s.rarity === 'number'
      ? clamp(s.rarity, 0, 1)
      : 0.5;
    if (!mapA.has(key) || mapA.get(key) < rarity) mapA.set(key, rarity);
  }
  let raritySum = 0;
  const shared = [];
  for (const s of scenesB) {
    const key = normName(typeof s === 'string' ? s : s?.name);
    if (!key || !mapA.has(key)) continue;
    if (!shared.includes(key)) {
      shared.push(key);
      raritySum += mapA.get(key);
    }
  }
  // Two mid-rarity shared scenes (~0.5 each) saturate the component.
  const points = WEIGHTS.scenes * clamp(raritySum / 1.0, 0, 1);
  return { points, shared };
}

/**
 * Gig component: same upcoming shows = "same room Friday" boost.
 * Each gig: { venue, date (YYYY-MM-DD), artist? }.
 */
function gigComponent(gigsA, gigsB) {
  const keysA = gigsA.map((g) => ({
    venue: normName(g?.venue),
    date: normName(g?.date),
    artist: normName(g?.artist)
  }));
  let points = 0;
  const shared = [];
  for (const g of gigsB) {
    const venue = normName(g?.venue);
    const date = normName(g?.date);
    const artist = normName(g?.artist);
    for (const a of keysA) {
      let hit = null;
      if (a.venue && venue && a.date && date && a.venue === venue && a.date === date) {
        hit = { points: WEIGHTS.gigs, label: `${venue} · ${date}` };
      } else if (a.venue && venue && a.venue === venue) {
        hit = { points: 8, label: `${venue} (another night)` };
      } else if (a.artist && artist && a.artist === artist) {
        hit = { points: 10, label: `${artist} (different venue)` };
      }
      if (hit && !shared.some((s) => s.label === hit.label)) {
        shared.push(hit);
        points += hit.points;
      }
    }
  }
  return { points: Math.min(points, WEIGHTS.gigs), shared };
}

/** Cosine similarity of two 4-axis fingerprint vectors (quiz.js scores 0-100). */
function fingerprintSimilarity(fpA, fpB) {
  const axes = ['heat', 'grit', 'depth', 'nocturne'];
  const a = axes.map((x) => clamp(Number(fpA?.[x] ?? 0), 0, 100));
  const b = axes.map((x) => clamp(Number(fpB?.[x] ?? 0), 0, 100));
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return clamp(dot / (magA * magB), 0, 1);
}

function profileShapeError(name, p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return `${name} must be an object.`;
  for (const [field, type] of [['topArtists', 'array'], ['topTracks', 'array'], ['topGenres', 'array'], ['scenes', 'array'], ['gigs', 'array']]) {
    if (p[field] !== undefined && !Array.isArray(p[field])) return `${name}.${field} must be an array.`;
  }
  return null;
}

function displayNameOf(p, fallback) {
  const n = normName(p?.displayName);
  return n ? p.displayName.trim() : fallback;
}

function tasteItemCount(p) {
  return (p.topArtists?.length ?? 0) + (p.topTracks?.length ?? 0) + (p.topGenres?.length ?? 0) + (p.scenes?.length ?? 0);
}

/**
 * Score a pair of profiles.
 * @param {object} a profile: { displayName?, topArtists?, topTracks?, topGenres?, scenes?, gigs?, fingerprint? }
 *   topArtists: [{ name, popularity? }] | [name]; topTracks/topGenres: [name] or [{name}];
 *   scenes: [{ name, rarity? }] | [name]; gigs: [{ venue, date, artist? }];
 *   fingerprint: { heat, grit, depth, nocturne } (0-100, from quiz.js scoreQuiz)
 * @param {object} b same shape
 * @returns {{ ok: boolean, error: string | null, result: object | null }}
 * Result: { score (0-100), components {artists,tracks,genres,scenes,gigs,fingerprint},
 *           reasons: string[], sharedArtists: string[<=3], sharedScenes: string[],
 *           sharedGigs: {label}[], provisional: boolean }
 */
export function scorePair(a, b) {
  const errA = profileShapeError('profile a', a);
  if (errA) return fail(errA);
  const errB = profileShapeError('profile b', b);
  if (errB) return fail(errB);

  const artistsA = artistWeightMap(a.topArtists ?? []);
  const artistsB = artistWeightMap(b.topArtists ?? []);
  const artists = WEIGHTS.artists * weightedJaccard(artistsA, artistsB);

  const tracks = WEIGHTS.tracks * weightedJaccard(nameWeightMap(a.topTracks ?? []), nameWeightMap(b.topTracks ?? []));
  const genres = WEIGHTS.genres * weightedJaccard(nameWeightMap(a.topGenres ?? []), nameWeightMap(b.topGenres ?? []));

  const { points: scenes, shared: sceneKeys } = sceneComponent(a.scenes ?? [], b.scenes ?? []);
  const { points: gigs, shared: gigHits } = gigComponent(a.gigs ?? [], b.gigs ?? []);

  let fingerprint = 0;
  if (a.fingerprint && b.fingerprint) {
    fingerprint = WEIGHTS.fingerprint * fingerprintSimilarity(a.fingerprint, b.fingerprint);
  }

  const score = Math.round(artists + tracks + genres + scenes + gigs + fingerprint);

  const nameA = displayNameOf(a, 'they');
  const nameB = displayNameOf(b, 'you');

  // Shared artists, long-tail first (obscure overlap is the strongest flex).
  const sharedArtistKeys = [...artistsA.keys()].filter((k) => artistsB.has(k));
  sharedArtistKeys.sort((x, y) => (artistsB.get(y) + artistsA.get(y)) - (artistsB.get(x) + artistsA.get(x)));
  const sharedArtists = sharedArtistKeys.slice(0, 3);

  const reasons = [];
  if (sharedArtists.length > 0) {
    reasons.push(
      sharedArtists.length === 1
        ? `You and ${nameA} both run ${sharedArtists[0]}.`
        : `You and ${nameA} share ${sharedArtistKeys.length} artist${sharedArtistKeys.length > 1 ? 's' : ''}, incl. ${sharedArtists.join(', ')}.`
    );
  }
  if (sceneKeys.length > 0) {
    reasons.push(
      sceneKeys.length === 1
        ? `You run with the same ${sceneKeys[0]} scene.`
        : `Same pack: ${sceneKeys.join(', ')} scenes overlap.`
    );
  }
  if (gigHits.length > 0) {
    reasons.push(`You'll be in the same room: ${gigHits[0].label}.`);
  }
  if (a.fingerprint && b.fingerprint && fingerprint >= WEIGHTS.fingerprint * 0.6) {
    reasons.push('Your sonic fingerprints rhyme — same frequency, same jungle.');
  }
  if (score >= 70) {
    reasons.push('High-voltage match. Somebody start the group chat.');
  }

  const provisional =
    tasteItemCount(a) < FRESH_EARS_MIN_ITEMS || tasteItemCount(b) < FRESH_EARS_MIN_ITEMS;
  if (provisional) {
    reasons.push(`Fresh ears: ${score === 0 ? 'not enough taste data yet — this is a guess, not a verdict' : 'thin data, so treat this score as a first impression'}.`);
  }

  // Explainability: a zero with no reasons feels like a bug.
  if (reasons.length === 0) {
    reasons.push('No shared artists, scenes, or shows yet — different corners of the jungle.');
  }

  return {
    ok: true,
    error: null,
    result: {
      score,
      components: {
        artists: Math.round(artists * 10) / 10,
        tracks: Math.round(tracks * 10) / 10,
        genres: Math.round(genres * 10) / 10,
        scenes: Math.round(scenes * 10) / 10,
        gigs: Math.round(gigs * 10) / 10,
        fingerprint: Math.round(fingerprint * 10) / 10
      },
      reasons,
      sharedArtists,
      sharedScenes: sceneKeys,
      sharedGigs: gigHits,
      provisional
    }
  };
}

function fail(error) {
  return { ok: false, error, result: null };
}
