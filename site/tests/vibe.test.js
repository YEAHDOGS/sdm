/**
 * Regression tests for the vibe score matching engine (src/lib/vibe.js).
 * Runs with plain node — no dependencies, no install:
 *   node --test tests/
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  FRESH_EARS_MIN_ITEMS,
  LONG_TAIL_BONUS,
  LONG_TAIL_MAX_POPULARITY,
  MAX_SCORE,
  WEIGHTS,
  scorePair
} from '../src/lib/vibe.js';

const rich = (over = {}) => ({
  displayName: 'Rae',
  topArtists: [
    { name: 'Amelie Lens', popularity: 55 },
    { name: 'Skee Mask', popularity: 25 },
    { name: 'Overmono', popularity: 45 }
  ],
  topTracks: ['Hypnotized', 'ISS009'],
  topGenres: ['techno', 'breakbeat'],
  scenes: [
    { name: 'techno', rarity: 0.9 },
    { name: 'warehouse', rarity: 0.6 }
  ],
  gigs: [{ venue: "Cain's Ballroom", date: '2026-10-10', artist: 'Amelie Lens' }],
  fingerprint: { heat: 85, grit: 40, depth: 70, nocturne: 90 },
  ...over
});

describe('WEIGHTS / constants', () => {
  it('weights sum to a 100-point scale', () => {
    assert.equal(MAX_SCORE, 100);
  });

  it('long-tail constants are sane', () => {
    assert.ok(LONG_TAIL_MAX_POPULARITY > 0 && LONG_TAIL_MAX_POPULARITY < 100);
    assert.ok(LONG_TAIL_BONUS > 0);
    assert.ok(FRESH_EARS_MIN_ITEMS >= 1);
  });
});

describe('scorePair validation', () => {
  it('rejects non-object profiles', () => {
    assert.equal(scorePair(null, {}).ok, false);
    assert.equal(scorePair({}, 'nope').ok, false);
    assert.equal(scorePair([], {}).ok, false);
  });

  it('rejects non-array list fields', () => {
    assert.equal(scorePair({ topArtists: 'techno' }, {}).ok, false);
    assert.equal(scorePair({}, { gigs: 42 }).ok, false);
  });
});

describe('scorePair scoring', () => {
  it('identical rich profiles score 100', () => {
    const { ok, result } = scorePair(rich(), rich());
    assert.equal(ok, true);
    assert.equal(result.score, 100);
    assert.equal(result.provisional, false);
  });

  it('completely disjoint profiles score 0', () => {
    const a = rich({ topArtists: ['A'], topTracks: ['t1'], topGenres: ['g1'], scenes: ['s1'], gigs: [] });
    const b = rich({ topArtists: ['B'], topTracks: ['t2'], topGenres: ['g2'], scenes: ['s2'], gigs: [], fingerprint: null });
    const { ok, result } = scorePair(a, b);
    assert.equal(ok, true);
    assert.equal(result.score, 0);
    assert.ok(result.reasons.length > 0);
  });

  it('empty profiles get a provisional 0, not a crash', () => {
    const { ok, result } = scorePair({}, {});
    assert.equal(ok, true);
    assert.equal(result.score, 0);
    assert.equal(result.provisional, true);
  });

  it('thin profiles are provisional even with overlap', () => {
    const { result } = scorePair({ topArtists: ['Skee Mask'] }, { topArtists: ['Skee Mask'] });
    assert.equal(result.provisional, true);
    assert.ok(result.score > 0);
    assert.ok(result.reasons.some((r) => r.includes('Fresh ears')));
  });

  it('is deterministic', () => {
    const a = scorePair(rich(), rich({ displayName: 'Jules' })).result;
    const b = scorePair(rich(), rich({ displayName: 'Jules' })).result;
    assert.deepEqual(a.score, b.score);
    assert.deepEqual(a.reasons, b.reasons);
  });

  it('normalizes artist name casing', () => {
    const { result } = scorePair({ topArtists: ['AMELIE LENS'] }, { topArtists: ['amelie lens'] });
    assert.ok(result.components.artists > 0, 'casing should not break overlap');
  });

  it('long-tail overlap outscores mainstream overlap', () => {
    const base = (sharedPopularity) => scorePair(
      { topArtists: [{ name: 'Shared', popularity: sharedPopularity }, { name: 'Mine Only', popularity: 90 }] },
      { topArtists: [{ name: 'Shared', popularity: sharedPopularity }, { name: 'Yours Only', popularity: 90 }] }
    ).result.components.artists;
    assert.ok(base(20) > base(90), `obscure ${base(20)} should beat mainstream ${base(90)}`);
  });

  it('rare shared scenes outscore common shared scenes', () => {
    const withRarity = (r) => scorePair(
      { scenes: [{ name: 'techno', rarity: r }] },
      { scenes: [{ name: 'techno', rarity: r }] }
    ).result.components.scenes;
    assert.ok(withRarity(0.9) > withRarity(0.2));
  });

  it('same venue + same date is the full gig boost; venue-only is partial', () => {
    const exact = scorePair(
      { gigs: [{ venue: "Cain's Ballroom", date: '2026-10-10' }] },
      { gigs: [{ venue: "Cain's Ballroom", date: '2026-10-10' }] }
    ).result.components.gigs;
    const venueOnly = scorePair(
      { gigs: [{ venue: "Cain's Ballroom", date: '2026-10-10' }] },
      { gigs: [{ venue: "Cain's Ballroom", date: '2026-11-01' }] }
    ).result.components.gigs;
    assert.equal(exact, WEIGHTS.gigs);
    assert.ok(venueOnly > 0 && venueOnly < exact);
  });

  it('same-room gig produces a "same room" reason', () => {
    const { result } = scorePair(
      { gigs: [{ venue: "Cain's Ballroom", date: '2026-10-10' }] },
      { gigs: [{ venue: "Cain's Ballroom", date: '2026-10-10' }] }
    );
    assert.ok(result.sharedGigs.length === 1);
    assert.ok(result.reasons.some((r) => r.includes('same room')));
  });

  it('fingerprint alignment adds points; missing fingerprint adds nothing', () => {
    const fp = { heat: 85, grit: 40, depth: 70, nocturne: 90 };
    const both = scorePair({ fingerprint: fp }, { fingerprint: fp }).result.components.fingerprint;
    const one = scorePair({ fingerprint: fp }, {}).result.components.fingerprint;
    assert.ok(both > 0, 'aligned fingerprints should contribute');
    assert.equal(one, 0, 'a missing fingerprint must never penalize');
  });

  it('opposed fingerprints contribute less than aligned ones', () => {
    const a = { heat: 95, grit: 90, depth: 10, nocturne: 95 };
    const aligned = { heat: 95, grit: 90, depth: 10, nocturne: 95 };
    const opposed = { heat: 5, grit: 10, depth: 90, nocturne: 5 };
    const s1 = scorePair({ fingerprint: a }, { fingerprint: aligned }).result.components.fingerprint;
    const s2 = scorePair({ fingerprint: a }, { fingerprint: opposed }).result.components.fingerprint;
    assert.ok(s1 > s2);
  });

  it('reasons name the shared artist', () => {
    const { result } = scorePair(
      { displayName: 'Rae', topArtists: ['Skee Mask'] },
      { displayName: 'Jules', topArtists: ['Skee Mask'] }
    );
    assert.ok(result.sharedArtists.includes('skee mask'));
    assert.ok(result.reasons.some((r) => r.toLowerCase().includes('skee mask')));
  });

  it('high-voltage matches get the group-chat nudge', () => {
    const { result } = scorePair(rich(), rich());
    assert.ok(result.reasons.some((r) => r.includes('group chat')));
  });

  it('score stays within 0-100 across mixed inputs', () => {
    const profiles = [
      {},
      rich(),
      { topArtists: ['X', 'Y', 'Z'], scenes: ['techno'] },
      { gigs: [{ venue: 'V', date: '2026-01-01' }], fingerprint: { heat: 1, grit: 2, depth: 3, nocturne: 4 } }
    ];
    for (const p of profiles) {
      for (const q of profiles) {
        const { ok, result } = scorePair(p, q);
        assert.equal(ok, true);
        assert.ok(result.score >= 0 && result.score <= 100, `score ${result.score} out of range`);
        const sum = Object.values(result.components).reduce((s, v) => s + v, 0);
        assert.ok(Math.abs(sum - result.score) <= 3, `components sum ${sum} != score ${result.score}`);
      }
    }
  });
});
