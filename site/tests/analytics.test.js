import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FUNNEL_STAGES,
  canonicalEmail,
  validateEvent,
  partitionEvents,
  kFactorOverWindows,
  conversionFunnel,
  referralLeaderboard,
  analyticsSummary
} from '../src/lib/analytics.js';

const DAY = 86_400_000;
const D1 = Date.UTC(2026, 8, 1, 12); // a Tuesday
const D2 = D1 + DAY;

function join(email, at, extra = {}) {
  return { type: 'joined', email, at, ...extra };
}
function invite(by, at) {
  return { type: 'invite_sent', by, at };
}
function activated(email, at) {
  return { type: 'activated', email, at };
}

// Known fixture: day 1 has 10 signups (5 referred by AAA), 30 invites by
// AAA, 3 activations. Day 2 adds 3 signups (2 referred by AAA), 4 invites.
function fixture() {
  const events = [];
  for (let i = 1; i <= 5; i++) events.push(join(`a${i}@example.com`, D1 + i * 1000, { referredBy: 'AAA', ip: `10.0.0.${i}` }));
  for (let i = 1; i <= 5; i++) events.push(join(`b${i}@example.com`, D1 + 10_000 + i * 1000));
  for (let i = 0; i < 30; i++) events.push(invite('AAA', D1 + i * 1000));
  events.push(activated('a1@example.com', D1 + 50_000));
  events.push(activated('a2@example.com', D1 + 51_000));
  events.push(activated('b1@example.com', D1 + 52_000));
  for (let i = 1; i <= 2; i++) events.push(join(`c${i}@example.com`, D2 + i * 1000, { referredBy: 'AAA', ip: `10.0.1.${i}` }));
  events.push(join('d1@example.com', D2 + 10_000));
  for (let i = 0; i < 4; i++) events.push(invite('AAA', D2 + i * 1000));
  return events;
}

describe('canonicalEmail', () => {
  it('lowercases, strips plus-tags and dots from the local part', () => {
    assert.equal(canonicalEmail('B.Rando+party@Dogs.NET'), 'brando@dogs.net');
  });
  it('returns null for non-emails', () => {
    assert.equal(canonicalEmail('not-an-email'), null);
    assert.equal(canonicalEmail(null), null);
    assert.equal(canonicalEmail('a@b'), null);
  });
});

describe('validateEvent', () => {
  it('accepts the three funnel event shapes', () => {
    for (const e of [
      invite('AAA', D1),
      join('a@example.com', D1, { referredBy: 'AAA' }),
      activated('a@example.com', D1)
    ]) {
      assert.equal(validateEvent(e).ok, true);
    }
  });
  it('rejects unknown types, missing timestamps, and bad emails', () => {
    assert.equal(validateEvent({ type: 'clicked', at: D1 }).ok, false);
    assert.equal(validateEvent({ type: 'joined', email: 'a@example.com' }).ok, false);
    assert.equal(validateEvent({ type: 'joined', email: 'nope', at: D1 }).ok, false);
    assert.equal(validateEvent({ type: 'invite_sent', at: D1 }).ok, false);
    assert.equal(validateEvent(null).ok, false);
  });
});

describe('partitionEvents', () => {
  it('separates valid from invalid without dropping the bad ones silently', () => {
    const bad = { type: 'joined', email: 'nope', at: D1 };
    const { valid, invalid } = partitionEvents([join('a@example.com', D1), bad]);
    assert.equal(valid.length, 1);
    assert.equal(invalid.length, 1);
    assert.equal(invalid[0].event, bad);
    assert.ok(invalid[0].error);
  });
});

describe('kFactorOverWindows', () => {
  it('computes daily k-factor against the known fixture', () => {
    const windows = kFactorOverWindows(fixture(), 'daily');
    assert.equal(windows.length, 2);
    const [d1, d2] = windows;
    assert.equal(d1.windowStart, new Date(Date.UTC(2026, 8, 1)).toISOString());
    assert.deepEqual(
      { signups: d1.signups, invitesSent: d1.invitesSent, invitesConverted: d1.invitesConverted },
      { signups: 10, invitesSent: 30, invitesConverted: 5 }
    );
    assert.equal(d1.kFactor, 0.5);
    assert.equal(d2.kFactor, 2 / 3);
  });
  it('merges days into a single weekly bucket', () => {
    const windows = kFactorOverWindows(fixture(), 'weekly');
    assert.equal(windows.length, 1);
    assert.equal(windows[0].kFactor, 7 / 13);
  });
  it('returns zeros for empty input', () => {
    assert.deepEqual(kFactorOverWindows([], 'daily'), []);
  });
});

describe('conversionFunnel', () => {
  it('computes funnel math against the known fixture', () => {
    const f = conversionFunnel(fixture());
    assert.equal(f.invitesSent, 34);
    assert.equal(f.joined, 13);
    assert.equal(f.joinedViaReferral, 7);
    assert.equal(f.activated, 3);
    assert.equal(f.inviteToJoin, 7 / 34);
    assert.equal(f.joinToActivated, 3 / 13);
    assert.equal(f.endToEnd, 3 / 34);
  });
  it('returns zeros, not NaN, when there are no events', () => {
    const f = conversionFunnel([]);
    assert.deepEqual([f.inviteToJoin, f.joinToActivated, f.endToEnd], [0, 0, 0]);
  });
});

describe('referralLeaderboard', () => {
  it('ranks by trusted referrals and flags gaming without dropping it', () => {
    const events = [
      // AAA: 4 legit referrals
      join('legit1@example.com', D1, { referredBy: 'AAA', ip: '10.0.0.1' }),
      join('legit2@example.com', D1 + 1000, { referredBy: 'AAA', ip: '10.0.0.2' }),
      join('legit3@example.com', D1 + 2000, { referredBy: 'AAA', ip: '10.0.0.3' }),
      join('legit4@example.com', D1 + 3000, { referredBy: 'AAA', ip: '10.0.0.4' }),
      // BBB: 1 legit + 2 from the same IP (flagged, kept)
      join('solo@example.com', D1, { referredBy: 'BBB', ip: '10.0.1.1' }),
      join('farm1@example.com', D1 + 1000, { referredBy: 'BBB', ip: '9.9.9.9' }),
      join('farm2@example.com', D1 + 2000, { referredBy: 'BBB', ip: '9.9.9.9' }),
      // CCC: a self-referral (rejected) + an aliased duplicate of the referrer's email (flagged)
      join('cheat@example.com', D1, { referredBy: 'CCC', referralCode: 'CCC', ip: '10.0.2.1' }),
      join('b.r.a.n.d.o+party@dogs.net', D1 + 1000, { referredBy: 'CCC', ip: '10.0.2.2' })
    ];
    const board = referralLeaderboard(events, { referrerEmails: { CCC: 'brando@dogs.net' } });
    const [aaa, bbb, ccc] = board;

    assert.equal(aaa.code, 'AAA');
    assert.deepEqual([aaa.credited, aaa.trusted], [4, 4]);
    assert.deepEqual(aaa.flags, []);

    assert.equal(bbb.code, 'BBB');
    assert.equal(bbb.credited, 3); // flagged joins still counted in raw totals
    assert.equal(bbb.trusted, 1);
    assert.ok(bbb.flags.includes('shared_ip'));

    assert.equal(ccc.code, 'CCC');
    assert.equal(ccc.credited, 1); // self-referral rejected from credit entirely
    assert.equal(ccc.trusted, 0);
    assert.ok(ccc.flags.includes('self_referral'));
    assert.ok(ccc.flags.includes('duplicate_account'));
  });

  it('flags shared devices and orders ties by earliest conversion', () => {
    const events = [
      join('x1@example.com', D1, { referredBy: 'DDD', device: 'fp-1' }),
      join('x2@example.com', D1 + 1000, { referredBy: 'DDD', device: 'fp-1' }),
      join('y1@example.com', D1 + 2000, { referredBy: 'EEE' })
    ];
    const board = referralLeaderboard(events);
    const ddd = board.find((r) => r.code === 'DDD');
    assert.ok(ddd.flags.includes('shared_device'));
    assert.equal(ddd.trusted, 0);
    // EEE has 1 trusted vs DDD's 0 -> EEE ranks first
    assert.equal(board[0].code, 'EEE');
  });

  it('returns an empty board for empty input', () => {
    assert.deepEqual(referralLeaderboard([]), []);
  });
});

describe('analyticsSummary', () => {
  it('bundles windows, funnel, and leaderboard with rejection counts', () => {
    const events = fixture();
    events.push({ type: 'joined', email: 'nope', at: D1 }); // one bad event
    const s = analyticsSummary(events, { window: 'daily' });
    assert.equal(s.events, fixture().length);
    assert.equal(s.eventsRejected, 1);
    assert.equal(s.windows.length, 2);
    assert.equal(s.funnel.invitesSent, 34);
    assert.equal(s.leaderboard[0].code, 'AAA');
  });
});

describe('FUNNEL_STAGES', () => {
  it('is frozen with the three stages', () => {
    assert.deepEqual([...FUNNEL_STAGES], ['invite_sent', 'joined', 'activated']);
  });
});
