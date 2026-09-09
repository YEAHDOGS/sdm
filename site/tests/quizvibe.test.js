/**
 * Regression tests for the quiz -> vibe wiring (src/lib/quizVibe.js).
 * Runs with plain node — no dependencies, no install:
 *   node --test tests/
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { QUESTIONS, scoreQuiz } from '../src/lib/quiz.js';
import { buildQuizProfile, scoreAgainstPack, topMatches, SAMPLE_PACK } from '../src/lib/quizVibe.js';

const allOf = (optId) => Object.fromEntries(QUESTIONS.map((q) => [q.id, optId]));

describe('SAMPLE_PACK', () => {
  it('has 3 personas with complete vibe profiles', () => {
    assert.equal(SAMPLE_PACK.length, 3);
    for (const p of SAMPLE_PACK) {
      assert.ok(p.displayName);
      assert.ok(p.topArtists.length > 0);
      assert.ok(p.topGenres.length > 0);
      for (const axis of ['heat', 'grit', 'depth', 'nocturne']) {
        assert.ok(p.fingerprint[axis] >= 0 && p.fingerprint[axis] <= 100, `${p.displayName}:${axis}`);
      }
    }
  });

  it('personas have distinct fingerprints (quiz can move the winner)', () => {
    const keys = SAMPLE_PACK.map((p) => JSON.stringify(p.fingerprint));
    assert.equal(new Set(keys).size, SAMPLE_PACK.length);
  });
});

describe('buildQuizProfile', () => {
  it('attaches the quiz fingerprint to the profile', () => {
    const { ok, result } = buildQuizProfile(allOf('a'));
    assert.ok(ok);
    const quiz = scoreQuiz(allOf('a')).result;
    assert.deepEqual(result.profile.fingerprint, quiz.scores);
    assert.equal(result.quiz.archetype.name, quiz.archetype.name);
  });

  it('fails loudly on incomplete quiz answers', () => {
    const { ok, error, result } = buildQuizProfile({ 'first-sound': 'a' });
    assert.equal(ok, false);
    assert.ok(error);
    assert.equal(result, null);
  });

  it('rejects a non-object extras bag', () => {
    const { ok, error } = buildQuizProfile(allOf('a'), 'nope');
    assert.equal(ok, false);
    assert.ok(error);
  });

  it('layers declared taste onto the profile when given', () => {
    const extras = { displayName: 'Test', topArtists: ['Skee Mask'], scenes: ['house show'] };
    const { result } = buildQuizProfile(allOf('a'), extras);
    assert.equal(result.profile.displayName, 'Test');
    assert.deepEqual(result.profile.topArtists, ['Skee Mask']);
    assert.deepEqual(result.profile.scenes, ['house show']);
  });

  it('defaults to empty taste arrays without extras', () => {
    const { result } = buildQuizProfile(allOf('a'));
    assert.deepEqual(result.profile.topArtists, []);
    assert.deepEqual(result.profile.scenes, []);
  });
});

describe('scoreAgainstPack', () => {
  it('ranks a heat/nocturne profile to Dom, and answers moving the winner', () => {
    const heatA = buildQuizProfile(allOf('a')).result.profile;
    const depthC = buildQuizProfile(allOf('c')).result.profile;

    const topA = scoreAgainstPack(heatA).result[0];
    const topC = scoreAgainstPack(depthC).result[0];
    assert.equal(topA.profile.displayName, 'Dom');
    assert.equal(topC.profile.displayName, 'Kira');
    assert.notEqual(topA.profile.displayName, topC.profile.displayName);
  });

  it('sorts matches by score descending with explainable reasons', () => {
    const { ok, result } = scoreAgainstPack(buildQuizProfile(allOf('b')).result.profile);
    assert.ok(ok);
    assert.equal(result.length, 3);
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i - 1].match.score >= result[i].match.score);
    }
    for (const { match } of result) {
      assert.ok(Array.isArray(match.reasons) && match.reasons.length >= 1);
      assert.ok(match.score >= 0 && match.score <= 100);
    }
  });

  it('declared artist overlap raises the matching persona, not the others', () => {
    const bare = buildQuizProfile(allOf('c')).result.profile;
    const withKiraArtist = buildQuizProfile(allOf('c'), { topArtists: ['Skee Mask'] }).result.profile;
    const scoreFor = (profile, name) =>
      scoreAgainstPack(profile).result.find((m) => m.profile.displayName === name).match.score;
    const kiraBare = scoreFor(bare, 'Kira');
    const kiraBoosted = scoreFor(withKiraArtist, 'Kira');
    assert.ok(kiraBoosted > kiraBare, 'shared artist should add points');
    assert.equal(scoreFor(withKiraArtist, 'Dom'), scoreFor(bare, 'Dom'), 'unrelated personas stay put');
  });

  it('a missing fingerprint never penalizes other components', () => {
    const withFp = buildQuizProfile(allOf('a')).result.profile;
    const withoutFp = { ...withFp, fingerprint: undefined };
    const a = scoreAgainstPack(withFp).result[0].match;
    const b = scoreAgainstPack(withoutFp).result[0].match;
    for (const key of ['artists', 'tracks', 'genres', 'scenes', 'gigs']) {
      assert.equal(a.components[key], b.components[key]);
    }
    assert.ok(a.score >= b.score, 'fingerprint can only add, never subtract');
  });

  it('rejects bad input loudly', () => {
    assert.equal(scoreAgainstPack(null).ok, false);
    assert.equal(scoreAgainstPack(buildQuizProfile(allOf('a')).result.profile, []).ok, false);
    assert.equal(scoreAgainstPack(buildQuizProfile(allOf('a')).result.profile, 'pack').ok, false);
  });
});

describe('topMatches', () => {
  it('returns the top N matches', () => {
    const profile = buildQuizProfile(allOf('d')).result.profile;
    const { ok, result } = topMatches(profile, 2);
    assert.ok(ok);
    assert.equal(result.length, 2);
    assert.ok(result[0].match.score >= result[1].match.score);
  });

  it('defaults to 3 and forwards errors', () => {
    const profile = buildQuizProfile(allOf('d')).result.profile;
    assert.equal(topMatches(profile).result.length, 3);
    assert.equal(topMatches(null).ok, false);
  });
});
