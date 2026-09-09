/**
 * Regression tests for the waitlist signup logic (src/lib/waitlist.js).
 * Runs with plain node — no dependencies, no install:
 *   node --test tests/
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { SCENES, validateEmail, validateSignup } from '../src/lib/waitlist.js';

describe('validateEmail', () => {
  it('accepts ordinary addresses and trims whitespace', () => {
    assert.equal(validateEmail('  Mara@Example.COM ').ok, true);
    assert.equal(validateEmail('a+b@sub.domain.co').ok, true);
  });

  it('rejects empty and non-string input', () => {
    assert.equal(validateEmail('').ok, false);
    assert.equal(validateEmail('   ').ok, false);
    assert.equal(validateEmail(null).ok, false);
    assert.equal(validateEmail(123).ok, false);
  });

  it('rejects malformed addresses', () => {
    for (const bad of [
      'no-at-sign',
      'no-tld@domain',
      'two@@ats.com',
      'spaces in@addr.com',
      'double..dots@x.com',
      '.leading@x.com',
      'trailing.@x.com'
    ]) {
      assert.equal(validateEmail(bad).ok, false, bad);
    }
  });

  it('rejects overlong addresses', () => {
    assert.equal(validateEmail('a'.repeat(250) + '@x.com').ok, false);
  });

  it('returns a human-readable error on failure', () => {
    const res = validateEmail('nope');
    assert.equal(res.ok, false);
    assert.ok(typeof res.error === 'string' && res.error.length > 0);
  });
});

describe('validateSignup', () => {
  it('builds a normalized payload for a full signup', () => {
    const res = validateSignup({
      email: ' Mara@Example.COM ',
      city: ' Tulsa ',
      scenes: ['techno', 'indie']
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.payload, {
      email: 'mara@example.com',
      city: 'Tulsa',
      scenes: ['techno', 'indie'],
      source: 'landing-page'
    });
  });

  it('defaults city to null and scenes to []', () => {
    const res = validateSignup({ email: 'a@b.co' });
    assert.equal(res.ok, true);
    assert.equal(res.payload.city, null);
    assert.deepEqual(res.payload.scenes, []);
  });

  it('dedupes and filters scenes to the allowlist', () => {
    const res = validateSignup({
      email: 'a@b.co',
      scenes: ['techno', 'Techno', ' polka ', 'indie']
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.payload.scenes, ['techno', 'indie']);
  });

  it('fails on a bad email and carries the error', () => {
    const res = validateSignup({ email: 'nope', city: 'Tulsa' });
    assert.equal(res.ok, false);
    assert.ok(res.error);
    assert.equal(res.payload, null);
  });

  it('fails on a non-list scenes value and on overlong cities', () => {
    assert.equal(validateSignup({ email: 'a@b.co', scenes: 'techno' }).ok, false);
    assert.equal(validateSignup({ email: 'a@b.co', city: 'x'.repeat(81) }).ok, false);
  });
});

describe('SCENES', () => {
  it('is frozen and non-empty', () => {
    assert.ok(SCENES.length > 0);
    assert.ok(Object.isFrozen(SCENES));
  });
});
