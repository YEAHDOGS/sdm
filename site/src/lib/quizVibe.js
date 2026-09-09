/**
 * Quiz → vibe wiring for the sdm landing page (TASKS.md P1 #5).
 *
 * Pure module — zero framework dependencies — so the Svelte quiz UI
 * (QuizVibe.svelte) and plain `node --test` regression tests both consume it.
 *
 * Two jobs:
 *  1. buildQuizProfile(answers, extras) — score the 10-question sonic
 *     fingerprint quiz and attach the resulting 4-axis vector as
 *     `profile.fingerprint` for the vibe engine (vibe.js scorePair).
 *     Declared taste (artists, tracks, genres, scenes, gigs) can be
 *     layered on later (P2 #8 onboarding); when absent the profile is
 *     still valid — the vibe engine treats it as "fresh ears".
 *  2. scoreAgainstPack(profile, pack) — run the vibe engine against
 *     SAMPLE_PACK demo personas and return the ranked matches with
 *     their explainable reasons[]. This is what the quiz result card
 *     shows live as answers change.
 */

import { scoreQuiz } from './quiz.js';
import { scorePair } from './vibe.js';

/**
 * Demo pack: three fictional jungle personas with distinct fingerprints.
 * Quiz-takers match different pack members depending on their answers,
 * which makes the live "top matches" panel actually move.
 */
export const SAMPLE_PACK = Object.freeze([
  Object.freeze({
    displayName: 'Kira',
    archetypeName: 'Echo Wolf',
    topArtists: Object.freeze([
      { name: 'Skee Mask', popularity: 28 },
      { name: 'Burial', popularity: 45 },
      { name: 'Forest Swords', popularity: 22 }
    ]),
    topTracks: Object.freeze(['Oversteps', 'Archangel']),
    topGenres: Object.freeze(['dub techno', 'ambient bass']),
    scenes: Object.freeze([
      { name: 'warehouse techno', rarity: 0.8 },
      { name: 'tulsa underground', rarity: 0.9 }
    ]),
    gigs: Object.freeze([{ venue: 'The Whittier Den', date: '2026-10-02' }]),
    fingerprint: Object.freeze({ heat: 35, grit: 40, depth: 88, nocturne: 85 })
  }),
  Object.freeze({
    displayName: 'Dom',
    archetypeName: 'Night Panther',
    topArtists: Object.freeze([
      { name: 'Amelie Lens', popularity: 70 },
      { name: 'Subtronics', popularity: 65 },
      { name: 'John Summit', popularity: 80 }
    ]),
    topTracks: Object.freeze(['Feel It', 'Bass Cannon']),
    topGenres: Object.freeze(['hard techno', 'bass music']),
    scenes: Object.freeze([
      { name: 'edm festival', rarity: 0.15 },
      { name: 'mainstage rave', rarity: 0.2 }
    ]),
    gigs: Object.freeze([{ venue: 'Cain\u2019s Ballroom', date: '2026-09-26' }]),
    fingerprint: Object.freeze({ heat: 92, grit: 35, depth: 25, nocturne: 88 })
  }),
  Object.freeze({
    displayName: 'Wren',
    archetypeName: 'Rust Fox',
    topArtists: Object.freeze([
      { name: 'Fugazi', popularity: 38 },
      { name: 'Alex G', popularity: 42 },
      { name: 'Wednesday', popularity: 25 }
    ]),
    topTracks: Object.freeze(['Blueprint', 'Bull Believer']),
    topGenres: Object.freeze(['emo', 'lo-fi indie']),
    scenes: Object.freeze([
      { name: 'diy basement', rarity: 0.75 },
      { name: 'house show', rarity: 0.6 }
    ]),
    gigs: Object.freeze([{ venue: 'The Mercury', date: '2026-10-09' }]),
    fingerprint: Object.freeze({ heat: 55, grit: 85, depth: 60, nocturne: 30 })
  })
]);

/**
 * Build a vibe-engine profile from quiz answers.
 * @param {Record<string, string>} answers map of questionId -> optionId
 * @param {object} extras optional declared taste + displayName, same shape
 *   as vibe.js profile fields (topArtists, topTracks, topGenres, scenes, gigs)
 * @returns {{ ok: boolean, error: string | null, result: object | null }}
 * Result: { profile, quiz: { scores, dominant, secondary, archetype, shareText } }
 */
export function buildQuizProfile(answers, extras = {}) {
  if (extras === null || typeof extras !== 'object' || Array.isArray(extras)) {
    return { ok: false, error: 'extras must be an object.', result: null };
  }
  const quiz = scoreQuiz(answers);
  if (!quiz.ok) return quiz;

  const pick = (key) => (Array.isArray(extras[key]) ? extras[key] : []);

  return {
    ok: true,
    error: null,
    result: {
      profile: {
        displayName: typeof extras.displayName === 'string' ? extras.displayName : 'you',
        topArtists: pick('topArtists'),
        topTracks: pick('topTracks'),
        topGenres: pick('topGenres'),
        scenes: pick('scenes'),
        gigs: pick('gigs'),
        fingerprint: quiz.result.scores
      },
      quiz: quiz.result
    }
  };
}

/**
 * Score a profile against a pack of demo personas.
 * @param {object} profile vibe.js profile (needs at least a fingerprint or taste)
 * @param {object[]} pack personas to match against (default SAMPLE_PACK)
 * @returns {{ ok: boolean, error: string | null, result: object[] | null }}
 * Result: array of { profile: persona, match: vibe result } sorted by
 * match.score descending.
 */
export function scoreAgainstPack(profile, pack = SAMPLE_PACK) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { ok: false, error: 'profile must be an object.', result: null };
  }
  if (!Array.isArray(pack) || pack.length === 0) {
    return { ok: false, error: 'pack must be a non-empty array.', result: null };
  }
  const scored = [];
  for (const persona of pack) {
    const res = scorePair(profile, persona);
    if (!res.ok) return res;
    scored.push({ profile: persona, match: res.result });
  }
  scored.sort((a, b) => b.match.score - a.match.score);
  return { ok: true, error: null, result: scored };
}

/**
 * Top-N matches convenience wrapper.
 * @returns {{ ok: boolean, error: string | null, result: object[] | null }}
 */
export function topMatches(profile, n = 3, pack = SAMPLE_PACK) {
  const res = scoreAgainstPack(profile, pack);
  if (!res.ok) return res;
  const count = Number.isInteger(n) && n > 0 ? n : 3;
  return { ok: true, error: null, result: res.result.slice(0, count) };
}
