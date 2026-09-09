/**
 * Sonic fingerprint quiz logic for the sdm landing page (TASKS.md P1 #5).
 *
 * Pure module — zero framework dependencies — so it can power the Svelte
 * quiz component AND be unit-tested with plain `node --test` (no install).
 *
 * How it works:
 *  - 10 questions, 4 options each. Every option adds 0–3 points on four
 *    axes: HEAT (energy/tempo), GRIT (rawness), DEPTH (underground vs
 *    mainstream), NOCTURNE (after-dark orientation).
 *  - Each axis normalizes to 0–100. The two strongest axes pick an
 *    archetype — your "sonic fingerprint" — with a shareable result card.
 *  - Copy follows docs/VOICE.md: jungle framing, music-first vocabulary,
 *    app-store-safe.
 */

export const AXES = Object.freeze(['heat', 'grit', 'depth', 'nocturne']);

/** @type {{ id: string, prompt: string, options: { id: string, label: string, scores: Record<string, number> }[] }[]} */
export const QUESTIONS = Object.freeze([
  {
    id: 'first-sound',
    prompt: 'The opening song of your life plays. It sounds like…',
    options: [
      { id: 'a', label: 'A bass drop that rattles the venue floor', scores: { heat: 3, grit: 1, depth: 0, nocturne: 2 } },
      { id: 'b', label: 'Feedback and a drummer counting in, 1-2-3-4', scores: { heat: 2, grit: 3, depth: 1, nocturne: 1 } },
      { id: 'c', label: 'A synth arpeggio nobody else has heard yet', scores: { heat: 1, grit: 0, depth: 3, nocturne: 2 } },
      { id: 'd', label: 'A chorus everyone in the room already knows', scores: { heat: 2, grit: 0, depth: 0, nocturne: 1 } }
    ]
  },
  {
    id: 'ideal-venue',
    prompt: 'Your perfect Friday night clearing (venue) is…',
    options: [
      { id: 'a', label: 'A warehouse with one strobe and no phones', scores: { heat: 3, grit: 2, depth: 2, nocturne: 3 } },
      { id: 'b', label: 'A sweaty basement where the PA might die', scores: { heat: 2, grit: 3, depth: 2, nocturne: 2 } },
      { id: 'c', label: 'An amphitheater under actual stars', scores: { heat: 1, grit: 0, depth: 1, nocturne: 1 } },
      { id: 'd', label: 'A rooftop with a view and a decent DJ', scores: { heat: 2, grit: 0, depth: 0, nocturne: 2 } }
    ]
  },
  {
    id: 'volume-knob',
    prompt: 'Be honest. Where does your volume knob live?',
    options: [
      { id: 'a', label: 'Pinned at 11. Eardrums are overrated', scores: { heat: 3, grit: 2, depth: 0, nocturne: 0 } },
      { id: 'b', label: 'Loud, but only because the riff demands it', scores: { heat: 2, grit: 3, depth: 1, nocturne: 0 } },
      { id: 'c', label: 'Headphones-in, world-out, all details audible', scores: { heat: 0, grit: 0, depth: 3, nocturne: 1 } },
      { id: 'd', label: 'Background hum while I do literally everything', scores: { heat: 1, grit: 0, depth: 0, nocturne: 0 } }
    ]
  },
  {
    id: 'setlist-pick',
    prompt: 'You control the setlist for one song. You pick…',
    options: [
      { id: 'a', label: 'The deep cut the diehards have been begging for', scores: { heat: 1, grit: 1, depth: 3, nocturne: 0 } },
      { id: 'b', label: 'The unreleased one the DJ just whispered about', scores: { heat: 2, grit: 0, depth: 3, nocturne: 2 } },
      { id: 'c', label: 'The hit. Maximum arms in the air', scores: { heat: 3, grit: 0, depth: 0, nocturne: 1 } },
      { id: 'd', label: 'A B-side cover nobody saw coming', scores: { heat: 1, grit: 2, depth: 2, nocturne: 0 } }
    ]
  },
  {
    id: 'midnight-energy',
    prompt: 'It’s 1 AM. Where’s your frequency?',
    options: [
      { id: 'a', label: 'Still on the dancefloor. The night just started', scores: { heat: 2, grit: 0, depth: 1, nocturne: 3 } },
      { id: 'b', label: 'Side stage, arguing about the drummer’s tuning', scores: { heat: 0, grit: 3, depth: 2, nocturne: 2 } },
      { id: 'c', label: 'Afterparty, crate-digging through someone’s vinyl', scores: { heat: 0, grit: 1, depth: 3, nocturne: 3 } },
      { id: 'd', label: 'Home, replaying the best track of the night', scores: { heat: 1, grit: 0, depth: 1, nocturne: 0 } }
    ]
  },
  {
    id: 'recording-love',
    prompt: 'The recording you love most is…',
    options: [
      { id: 'a', label: 'Polished to a mirror shine. Every stem perfect', scores: { heat: 1, grit: 0, depth: 0, nocturne: 0 } },
      { id: 'b', label: 'One take, bleeding mics, you can hear the room', scores: { heat: 1, grit: 3, depth: 1, nocturne: 0 } },
      { id: 'c', label: 'A demo that never got a proper release', scores: { heat: 0, grit: 2, depth: 3, nocturne: 1 } },
      { id: 'd', label: 'A live bootleg that sounds like a riot', scores: { heat: 3, grit: 2, depth: 1, nocturne: 2 } }
    ]
  },
  {
    id: 'dance-move',
    prompt: 'The drop hits. Your body does what?',
    options: [
      { id: 'a', label: 'Full send. I’m airborne', scores: { heat: 3, grit: 1, depth: 0, nocturne: 1 } },
      { id: 'b', label: 'Headbang. Neck injury pending', scores: { heat: 2, grit: 3, depth: 0, nocturne: 0 } },
      { id: 'c', label: 'The slow nod. I’m studying the layers', scores: { heat: 0, grit: 0, depth: 3, nocturne: 1 } },
      { id: 'd', label: 'Two-step with a drink held dangerously high', scores: { heat: 2, grit: 0, depth: 0, nocturne: 2 } }
    ]
  },
  {
    id: 'discovery',
    prompt: 'How do new artists enter your jungle?',
    options: [
      { id: 'a', label: 'A friend’s cryptic 3 AM link. No context', scores: { heat: 0, grit: 1, depth: 3, nocturne: 2 } },
      { id: 'b', label: 'Opening bands. I show up early on purpose', scores: { heat: 1, grit: 1, depth: 2, nocturne: 1 } },
      { id: 'c', label: 'The charts. 40 million streams can’t be wrong', scores: { heat: 2, grit: 0, depth: 0, nocturne: 0 } },
      { id: 'd', label: 'Digging — record fairs, side B’s, radio static', scores: { heat: 0, grit: 2, depth: 3, nocturne: 1 } }
    ]
  },
  {
    id: 'encore',
    prompt: 'The lights come up mid-set. Power cut. You…',
    options: [
      { id: 'a', label: 'Start the chant. We’re not leaving', scores: { heat: 3, grit: 1, depth: 0, nocturne: 1 } },
      { id: 'b', label: 'Crowd-surf over to the bar. Unbothered', scores: { heat: 2, grit: 0, depth: 0, nocturne: 2 } },
      { id: 'c', label: 'Mourn the mix. That set was historic', scores: { heat: 0, grit: 1, depth: 3, nocturne: 1 } },
      { id: 'd', label: 'Unplugged singalong starts. I’m leading it', scores: { heat: 1, grit: 3, depth: 1, nocturne: 1 } }
    ]
  },
  {
    id: 'desert-island',
    prompt: 'Desert island. One artist’s full catalog. Go.',
    options: [
      { id: 'a', label: 'Whoever brings the most BPM per minute', scores: { heat: 3, grit: 0, depth: 1, nocturne: 1 } },
      { id: 'b', label: 'The one with the unpolished, ugly-beautiful takes', scores: { heat: 1, grit: 3, depth: 1, nocturne: 0 } },
      { id: 'c', label: 'The act with 12 people at their first show. I was one', scores: { heat: 0, grit: 1, depth: 3, nocturne: 0 } },
      { id: 'd', label: 'The one I can sing every word to, forever', scores: { heat: 2, grit: 0, depth: 0, nocturne: 0 } }
    ]
  }
]);

/**
 * Sonic fingerprint archetypes, keyed by dominant+secondary axis pair
 * (axes sorted alphabetically inside the key, e.g. 'depth+heat').
 * Every one of the 6 possible pairs maps to an archetype; a 7th "even
 * split" archetype covers near-ties across the board.
 */
export const ARCHETYPES = Object.freeze({
  'heat+nocturne': {
    name: 'Night Panther',
    tagline: 'High voltage after dark.',
    blurb: 'You hunt the loudest room in the city and you do not leave early. Your matches better keep up — or get lapped.'
  },
  'depth+heat': {
    name: 'Static Owl',
    tagline: 'Rare signal, full volume.',
    blurb: 'You dig deeper than the algorithm and you play it louder than the headliner. Your pack is small and exact.'
  },
  'grit+heat': {
    name: 'Bass Hyena',
    tagline: 'Raw power, no polish required.',
    blurb: 'Feedback, floor toms, blown speakers — beauty in the wreckage. You match hardest with fellow beautiful disasters.'
  },
  'grit+nocturne': {
    name: 'Doom Vulture',
    tagline: 'Heavy things at heavy hours.',
    blurb: 'Slow riffs, late sets, basements with low ceilings. You circle the heaviest watering holes in the jungle.'
  },
  'depth+nocturne': {
    name: 'Echo Wolf',
    tagline: 'The 3 AM crate-digger.',
    blurb: 'While everyone sleeps you are three clicks deep in a side project’s side project. Your frequency is a secret handshake.'
  },
  'depth+grit': {
    name: 'Rust Fox',
    tagline: 'Obscure and unpolished on purpose.',
    blurb: 'B-sides, bootlegs, demos with tape hiss. You’d rather find the den than follow the herd — and the den finds you.'
  },
  even: {
    name: 'Jungle Generalist',
    tagline: 'A little of everything, all of the night.',
    blurb: 'No single axis owns you. You roam the whole jungle — which makes your vibe score compatible with almost any pack.'
  }
});

/** Pair lookup for the single-dominant-axis fallback. */
const DOMINANT_ONLY = Object.freeze({
  heat: ARCHETYPES['heat+nocturne'],
  grit: ARCHETYPES['grit+heat'],
  depth: ARCHETYPES['depth+heat'],
  nocturne: ARCHETYPES['heat+nocturne']
});

const MAX_PER_OPTION = 3;

/**
 * Score a completed quiz.
 * @param {Record<string, string>} answers map of questionId -> optionId
 * @returns {{ ok: boolean, error: string | null, result: object | null }}
 * Result: { scores: {heat,grit,depth,nocturne} (0-100), dominant, secondary,
 *           archetype: {name,tagline,blurb}, shareText }
 */
export function scoreQuiz(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return fail('Answers must be an object mapping question ids to option ids.');
  }

  const raw = { heat: 0, grit: 0, depth: 0, nocturne: 0 };

  for (const q of QUESTIONS) {
    const picked = answers[q.id];
    if (typeof picked !== 'string' || picked.length === 0) {
      return fail(`Question "${q.id}" needs an answer.`);
    }
    const opt = q.options.find((o) => o.id === picked);
    if (!opt) {
      return fail(`Unknown option "${picked}" for question "${q.id}".`);
    }
    for (const axis of AXES) {
      raw[axis] += opt.scores[axis] ?? 0;
    }
  }

  const maxTotal = QUESTIONS.length * MAX_PER_OPTION;
  const scores = {};
  for (const axis of AXES) {
    scores[axis] = Math.round((100 * raw[axis]) / maxTotal);
  }

  const ranked = [...AXES].sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const [dominant, secondary] = ranked;
  const spread = scores[dominant] - scores[ranked[ranked.length - 1]];

  // Near-tie across all axes: no clear dominant trait -> generalist.
  // (Min achievable spread over real answer patterns is ~16, so 20 keeps
  // the even-split archetype reachable without mislabeling strong profiles.)
  const archetype =
    spread <= 20
      ? ARCHETYPES.even
      : pairArchetype(dominant, secondary);

  return {
    ok: true,
    error: null,
    result: {
      scores,
      dominant,
      secondary,
      archetype,
      shareText:
        `I’m a ${archetype.name} on sdm — ${archetype.tagline} ` +
        `Find your pack. 🐆🎵`
    }
  };
}

function pairArchetype(a, b) {
  const key = [a, b].sort().join('+');
  return ARCHETYPES[key] ?? DOMINANT_ONLY[a] ?? ARCHETYPES.even;
}

function fail(error) {
  return { ok: false, error, result: null };
}
