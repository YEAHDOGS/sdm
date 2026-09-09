/**
 * Regression tests for the waitlist/referral abuse guards
 * (src/lib/abuseGuards.js, P1 #6 hardening).
 * Runs with plain node — no dependencies, no install:
 *   node --test tests/abuseGuards.test.js
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  EMAIL_RATE_LIMITS,
  IP_RATE_LIMITS,
  RateLimiter,
  classifyReferral,
  getClientIp,
  isSelfReferral
} from '../src/lib/abuseGuards.js';

function fakeHeaders(entries) {
  const map = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name) => map.get(String(name).toLowerCase()) ?? null };
}

describe('RateLimiter', () => {
  it('allows up to the max inside the window, then denies', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter([{ windowMs: 60_000, max: 3 }], () => now);
    assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.hit('a').ok, true);
    const denied = limiter.hit('a');
    assert.equal(denied.ok, false);
    assert.ok(denied.retryAfterMs > 0 && denied.retryAfterMs <= 60_000);
  });

  it('applies the tightest of multiple windows', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter(IP_RATE_LIMITS, () => now);
    for (let i = 0; i < 5; i++) assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.hit('a').ok, false); // 10-min window trips first
  });

  it('resets the budget once the window slides past the hits', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter([{ windowMs: 60_000, max: 2 }], () => now);
    assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.hit('a').ok, false);
    now += 61_000;
    assert.equal(limiter.hit('a').ok, true);
  });

  it('isolates keys from each other', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter([{ windowMs: 60_000, max: 1 }], () => now);
    assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.hit('a').ok, false);
    assert.equal(limiter.hit('b').ok, true);
  });

  it('check() does not consume budget', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter([{ windowMs: 60_000, max: 1 }], () => now);
    assert.equal(limiter.check('a').ok, true);
    assert.equal(limiter.check('a').ok, true);
    assert.equal(limiter.hit('a').ok, true);
    assert.equal(limiter.check('a').ok, false);
  });

  it('purge() and reset() forget stale state', () => {
    let now = 1_000_000;
    const limiter = new RateLimiter([{ windowMs: 60_000, max: 1 }], () => now);
    limiter.hit('a');
    assert.equal(limiter.size, 1);
    limiter.reset();
    assert.equal(limiter.size, 0);
    assert.equal(limiter.hit('a').ok, true);
  });

  it('rejects bad limit configs up front', () => {
    assert.throws(() => new RateLimiter([]), /non-empty/);
    assert.throws(() => new RateLimiter([{ windowMs: -5, max: 3 }]), /windowMs/);
    assert.throws(() => new RateLimiter([{ windowMs: 1000, max: 0 }]), /max/);
  });

  it('ships sane production defaults', () => {
    assert.equal(IP_RATE_LIMITS[0].max, 5);
    assert.equal(EMAIL_RATE_LIMITS[0].max, 3);
  });
});

describe('getClientIp', () => {
  it('prefers cf-connecting-ip, then left-most x-forwarded-for, then x-real-ip', () => {
    const h = fakeHeaders({
      'cf-connecting-ip': ' 203.0.113.7 ',
      'x-forwarded-for': '70.1.2.3, 10.0.0.1',
      'x-real-ip': '198.51.100.9'
    });
    assert.equal(getClientIp(h), '203.0.113.7');
    const h2 = fakeHeaders({ 'x-forwarded-for': '70.1.2.3, 10.0.0.1', 'x-real-ip': '198.51.100.9' });
    assert.equal(getClientIp(h2), '70.1.2.3');
    const h3 = fakeHeaders({ 'x-real-ip': '198.51.100.9' });
    assert.equal(getClientIp(h3), '198.51.100.9');
  });

  it('returns null when no header is usable', () => {
    assert.equal(getClientIp(fakeHeaders({})), null);
    assert.equal(getClientIp(null), null);
    assert.equal(getClientIp({}), null);
  });
});

describe('isSelfReferral', () => {
  it('flags own-code === referredBy, case-insensitively', () => {
    assert.equal(isSelfReferral('ABCD2345', 'abcd2345'), true);
    assert.equal(isSelfReferral(' ABCD2345 ', 'ABCD2345'), true);
  });

  it('is false for different codes and for blanks', () => {
    assert.equal(isSelfReferral('ABCD2345', 'WXYZ6789'), false);
    assert.equal(isSelfReferral('ABCD2345', null), false);
    assert.equal(isSelfReferral(null, 'ABCD2345'), false);
    assert.equal(isSelfReferral('nope!!', 'ABCD2345'), false);
  });
});

describe('classifyReferral', () => {
  it('passes through blank referredBy as no-referrer', () => {
    assert.deepEqual(classifyReferral({ referredBy: null }), { ok: true, code: null });
    assert.deepEqual(classifyReferral({ referredBy: '   ' }), { ok: true, code: null });
    assert.deepEqual(classifyReferral({}), { ok: true, code: null });
  });

  it('credits valid codes, normalizing them', () => {
    assert.deepEqual(classifyReferral({ referredBy: 'abcd2345' }), { ok: true, code: 'ABCD2345' });
  });

  it('accepts full pasted share URLs like the old endpoint did', () => {
    const r = classifyReferral({ referredBy: 'https://sdm.app/?ref=abcd2345' });
    assert.deepEqual(r, { ok: true, code: 'ABCD2345' });
  });

  it('rejects invalid codes', () => {
    assert.deepEqual(classifyReferral({ referredBy: 'nope!!' }), { ok: false, reason: 'invalid-code' });
  });

  it('rejects self-referrals', () => {
    assert.deepEqual(classifyReferral({ ownCode: 'ABCD2345', referredBy: 'abcd2345' }), {
      ok: false,
      reason: 'self-referral'
    });
  });
});
