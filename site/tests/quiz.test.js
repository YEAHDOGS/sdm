/**
 * Regression tests for the sonic fingerprint quiz (src/lib/quiz.js).
 * Runs with plain node — no dependencies, no install:
 *   node --test tests/
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { ARCHETYPES, AXES, QUESTIONS, scoreQuiz } from '../src/lib/quiz.js';

const firstOptions = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[0].id]));

describe('QUESTIONS shape', () => {
  it('has exactly 10 questions with 4 options each', () => {
    assert.equal(QUESTIONS.length, 10);
    for (const q of QUESTIONS) {
      assert.equal(q.options.length, 4, q.id);
      assert.ok(q.id && q.prompt);
    }
  });

  it('uses unique question ids and option ids', () => {
    const ids = QUESTIONS.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const q of QUESTIONS) {
      const opts = q.options.map((o) => o.id);
      assert.equal(new Set(opts).size, opts.length, q.id);
    }
  });

  it('scores only known axes within 0-3', () => {
    for (const q of QUESTIONS) {
      for (const o of q.options) {
        for (const [axis, val] of Object.entries(o.scores)) {
          assert.ok(AXES.includes(axis), `${q.id}:${o.id} bad axis ${axis}`);
          assert.ok(Number.isInteger(val) && val >= 0 && val <= 3, `${q.id}:${o.id} score out of range`);
        }
      }
    }
  });
});

describe('scoreQuiz validation', () => {
  it('rejects non-object answers', () => {
    assert.equal(scoreQuiz(null).ok, false);
    assert.equal(scoreQuiz('nope').ok, false);
    assert.equal(scoreQuiz([]).ok, false);
  });

  it('rejects missing and unknown answers', () => {
    const partial = firstOptions();
    delete partial['first-sound'];
    assert.equal(scoreQuiz(partial).ok, false);

    const bad = firstOptions();
    bad['first-sound'] = 'zzz';
    assert.equal(scoreQuiz(bad).ok, false);
  });
});

describe('scoreQuiz scoring', () => {
  it('returns 0-100 scores on every axis', () => {
    const { ok, result } = scoreQuiz(firstOptions());
    assert.equal(ok, true);
    for (const axis of AXES) {
      assert.ok(result.scores[axis] >= 0 && result.scores[axis] <= 100, axis);
    }
  });

  it('picks the all-first-options archetype deterministically', () => {
    const a = scoreQuiz(firstOptions()).result;
    const b = scoreQuiz(firstOptions()).result;
    assert.equal(a.archetype.name, b.archetype.name);
    assert.deepEqual(a.scores, b.scores);
  });

  it('all-low-key answers land on a named archetype with share text', () => {
    const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[3].id]));
    const { ok, result } = scoreQuiz(answers);
    assert.equal(ok, true);
    assert.ok(result.archetype.name && result.archetype.tagline && result.archetype.blurb);
    assert.ok(result.shareText.includes(result.archetype.name));
    assert.ok(result.shareText.includes('sdm'));
  });

  it('a genuinely balanced answer set gets the even-split archetype', () => {
    // Spread <= 20 across axes means no dominant trait (see threshold note
    // in scoreQuiz). Build one by cycling options; assert it lands on even.
    let found = null;
    for (let seed = 0; seed < 64 && !found; seed++) {
      const answers = Object.fromEntries(
        QUESTIONS.map((q, i) => [q.id, q.options[(seed * 7 + i * 13) % 4].id])
      );
      const { result } = scoreQuiz(answers);
      const v = AXES.map((a) => result.scores[a]);
      if (Math.max(...v) - Math.min(...v) <= 20) found = result;
    }
    assert.ok(found, 'expected at least one balanced answer pattern');
    assert.equal(found.archetype.name, ARCHETYPES.even.name);
  });
});

describe('ARCHETYPES coverage', () => {
  it('covers every dominant+secondary pair plus even', () => {
    const pairs = [];
    for (let i = 0; i < AXES.length; i++) {
      for (let j = i + 1; j < AXES.length; j++) {
        pairs.push([AXES[i], AXES[j]].sort().join('+'));
      }
    }
    for (const p of pairs) assert.ok(ARCHETYPES[p], `missing pair ${p}`);
    assert.ok(ARCHETYPES.even);
  });
});
