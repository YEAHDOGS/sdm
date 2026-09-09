/**
 * Regression tests for the waitlist referral loop (src/lib/referral.js, P1 #6).
 * Runs with plain node — no dependencies, no install:
 *   node --test tests/
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  JUMP_PER_REFERRAL,
  MAX_JUMP,
  isReferralCode,
  makeReferralCode,
  normalizeCode,
  parseReferral,
  rankQueue,
  shareLink,
  shareText,
  viralStats
} from '../src/lib/referral.js';

describe('makeReferralCode', () => {
  it('makes codes of the default length from the unambiguous alphabet', () => {
    const code = makeReferralCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.ok(isReferralCode(code));
    assert.ok(!/[01IL]/i.test(code), 'no ambiguous characters');
  });

  it('respects a custom length and makes unique codes', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const code = makeReferralCode(12);
      assert.equal(code.length, 12);
      seen.add(code);
    }
    assert.ok(seen.size > 190, 'codes should be effectively unique');
  });

  it('falls back to the default length on bad input', () => {
    assert.equal(makeReferralCode(0).length, CODE_LENGTH);
    assert.equal(makeReferralCode(-3).length, CODE_LENGTH);
    assert.equal(makeReferralCode('x').length, CODE_LENGTH);
  });
});

describe('isReferralCode / normalizeCode', () => {
  it('accepts real codes, case-insensitively, with whitespace tolerated', () => {
    assert.equal(isReferralCode('abcd2345'), true);
    assert.equal(normalizeCode(' abcd2345 '), 'ABCD2345');
  });

  it('rejects ambiguous characters, junk, and wrong shapes', () => {
    for (const bad of ['ABC0123I', 'ABC', 'x'.repeat(33), '', '   ', 'ABC D45', null, 123, 'ABC-2345']) {
      assert.equal(isReferralCode(bad), false, String(bad));
      assert.equal(normalizeCode(bad), null, String(bad));
    }
  });

  it('exposes an unambiguous alphabet', () => {
    assert.ok(!/[01IL]/.test(CODE_ALPHABET), 'alphabet must be unambiguous');
    assert.ok(CODE_ALPHABET.length >= 24);
  });
});

describe('shareLink / parseReferral', () => {
  it('builds a ?ref= link from code + base', () => {
    assert.equal(shareLink('abcd2345', 'https://sdm.app'), 'https://sdm.app/?ref=ABCD2345');
    assert.equal(shareLink('abcd2345', 'https://sdm.app///'), 'https://sdm.app/?ref=ABCD2345');
  });

  it('throws on bad code or base', () => {
    assert.throws(() => shareLink('nope!', 'https://sdm.app'), /invalid referral code/);
    assert.throws(() => shareLink('abcd2345', 'not-a-url'), /http/);
    assert.throws(() => shareLink('abcd2345', ''), /http/);
  });

  it('parses codes from full URLs, query strings, and bare codes', () => {
    assert.equal(parseReferral('https://sdm.app/?ref=abcd2345'), 'ABCD2345');
    assert.equal(parseReferral('https://sdm.app/?city=tulsa&ref=ABCD2345#top'), 'ABCD2345');
    assert.equal(parseReferral('?ref=abcd2345'), 'ABCD2345');
    assert.equal(parseReferral('abcd2345'), 'ABCD2345');
  });

  it('returns null for non-code input', () => {
    for (const bad of ['https://sdm.app/', '?ref=', '?ref=BAD!!', '', '   ', null, 42]) {
      assert.equal(parseReferral(bad), null, String(bad));
    }
  });
});

describe('rankQueue', () => {
  const base = [
    { email: 'a@x.co', joinedAt: 100, referrals: 0 },
    { email: 'b@x.co', joinedAt: 200, referrals: 0 },
    { email: 'c@x.co', joinedAt: 300, referrals: 0 }
  ];

  it('keeps arrival order when nobody has referrals', () => {
    const ranked = rankQueue(base);
    assert.deepEqual(ranked.map((r) => r.email), ['a@x.co', 'b@x.co', 'c@x.co']);
    assert.deepEqual(ranked.map((r) => r.position), [1, 2, 3]);
    assert.ok(ranked.every((r) => r.jumped === 0));
  });

  it('jumps the inviter up by referrals x JUMP_PER_REFERRAL', () => {
    const signups = [
      { email: 'a@x.co', joinedAt: 100, referrals: 0 },
      { email: 'b@x.co', joinedAt: 200, referrals: 1 }, // effective: 1 - 3 = -2
      { email: 'c@x.co', joinedAt: 300, referrals: 0 }
    ];
    const ranked = rankQueue(signups);
    assert.deepEqual(ranked.map((r) => r.email), ['b@x.co', 'a@x.co', 'c@x.co']);
    assert.equal(ranked[0].jumped, 1);
    assert.equal(ranked[0].position, 1);
  });

  it('caps the total jump at MAX_JUMP — more referrals cannot beat the cap', () => {
    const crowd = Array.from({ length: 30 }, (_, i) => ({
      email: `u${i}@x.co`,
      joinedAt: 100 + i,
      referrals: 0
    }));
    const jumpedOf = (referrals) =>
      rankQueue([...crowd, { email: 'whale@x.co', joinedAt: 999, referrals }]).find(
        (r) => r.email === 'whale@x.co'
      ).jumped;
    const capped = jumpedOf(9); // 9 x 3 = 27 already past the cap
    assert.ok(capped <= MAX_JUMP);
    assert.equal(jumpedOf(1000), capped, 'uncapped referrals gain nothing more');
    assert.ok(capped > jumpedOf(2), 'the cap still rewards real referrals');
  });

  it('treats missing/negative referrals as zero and drops junk rows', () => {
    const ranked = rankQueue([
      { email: 'a@x.co', joinedAt: 100, referrals: -5 },
      { email: 'b@x.co', joinedAt: 200 },
      { email: 'junk', joinedAt: NaN },
      null
    ]);
    assert.deepEqual(ranked.map((r) => r.email), ['a@x.co', 'b@x.co']);
    assert.ok(ranked.every((r) => r.referrals === 0));
  });

  it('returns [] for non-array input', () => {
    assert.deepEqual(rankQueue(null), []);
    assert.deepEqual(rankQueue('nope'), []);
  });
});

describe('viralStats', () => {
  it('computes k-factor, invites/signup, and conversion rate', () => {
    const stats = viralStats([
      { invites: 4, referrals: 2 },
      { invites: 2, referrals: 1 },
      { invites: 0, referrals: 0 }
    ]);
    assert.equal(stats.signups, 3);
    assert.equal(stats.invitesSent, 6);
    assert.equal(stats.invitesConverted, 3);
    assert.equal(stats.invitesPerSignup, 2);
    assert.equal(stats.conversionRate, 0.5);
    assert.equal(stats.kFactor, 1); // 3 converted / 3 signups — self-sustaining
  });

  it('zeros everything on empty input', () => {
    const stats = viralStats([]);
    assert.deepEqual(stats, {
      signups: 0,
      invitesSent: 0,
      invitesConverted: 0,
      invitesPerSignup: 0,
      conversionRate: 0,
      kFactor: 0
    });
  });

  it('handles zero invites without NaN', () => {
    const stats = viralStats([{ invites: 0, referrals: 0 }]);
    assert.equal(stats.conversionRate, 0);
    assert.equal(stats.kFactor, 0);
  });
});

describe('shareText', () => {
  it('writes on-voice copy with the code and optional city', () => {
    const text = shareText('abcd2345', { city: 'Tulsa' });
    assert.ok(text.includes('ABCD2345'));
    assert.ok(text.includes('Tulsa'));
  });

  it('works without a city and throws on a bad code', () => {
    assert.ok(shareText('abcd2345').includes('ABCD2345'));
    assert.throws(() => shareText('junk!'), /invalid referral code/);
  });
});
