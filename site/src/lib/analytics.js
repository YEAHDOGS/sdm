/**
 * Referral analytics for the sdm waitlist (P1 #6, analytics layer).
 *
 * Pure module — zero framework dependencies, zero network — so it can run
 * inside the /api/waitlist or /api/referral endpoints AND be unit-tested
 * with plain `node --test` (no install needed).
 *
 * Data model — events (chronological referral activity):
 *   { type: 'invite_sent', by: '<REFCODE>', at: <ms-epoch> }
 *   { type: 'joined', email: 'a@b.c', referredBy: '<REFCODE>' | null, at: <ms-epoch>,
 *     ip?: '1.2.3.4', device?: 'fingerprint' }
 *   { type: 'activated', email: 'a@b.c', at: <ms-epoch> }
 * A 'joined' event may also carry referralCode (the code handed to that
 * signup) so self-referrals can be detected.
 *
 * Anti-gaming policy (matches referral.js notes: flag, never silently drop):
 * - Self-referral (referredBy === the joiner's own code): REJECTED from
 *   credit — it never counts toward a referrer's score.
 * - Duplicate-account heuristics (same IP or same device across multiple
 *   joiners credited to one referrer; plus-address/dot variants of the
 *   referrer's own email): FLAGGED, still counted in the raw totals, but
 *   excluded from the *trusted* score the leaderboard ranks by. The flag
 *   travels with the data so a human can review it later (P3 #15).
 */

export const FUNNEL_STAGES = Object.freeze(['invite_sent', 'joined', 'activated']);

/**
 * Normalize an email for duplicate-account comparison: lowercase, strip
 * plus-tags and dots in the local part (gmail-style aliasing).
 * @param {unknown} email
 * @returns {string | null}
 */
export function canonicalEmail(email) {
  if (typeof email !== 'string') return null;
  const raw = email.trim().toLowerCase();
  const at = raw.indexOf('@');
  if (at < 1 || at === raw.length - 1) return null;
  const local = raw.slice(0, at).split('+')[0].replace(/\./g, '');
  const domain = raw.slice(at + 1);
  if (local === '' || domain.indexOf('.') < 0) return null;
  return `${local}@${domain}`;
}

/**
 * Validate a single analytics event. Follows the repo's { ok, error }
 * validation style (see lib/waitlist.js).
 * @param {unknown} event
 * @returns {{ ok: boolean, error: string | null }}
 */
export function validateEvent(event) {
  if (!event || typeof event !== 'object') {
    return { ok: false, error: 'Event must be an object.' };
  }
  if (!FUNNEL_STAGES.includes(event.type)) {
    return { ok: false, error: `Event type must be one of: ${FUNNEL_STAGES.join(', ')}.` };
  }
  if (!Number.isFinite(event.at)) {
    return { ok: false, error: 'Event needs a numeric `at` timestamp (ms epoch).' };
  }
  if (event.type === 'invite_sent') {
    if (typeof event.by !== 'string' || event.by.trim() === '') {
      return { ok: false, error: 'invite_sent needs `by` (the referrer code).' };
    }
  } else {
    if (canonicalEmail(event.email) === null) {
      return { ok: false, error: 'joined/activated needs a valid `email`.' };
    }
  }
  return { ok: true, error: null };
}

/**
 * Partition events into valid vs invalid (invalid ones are reported, not
 * silently dropped).
 * @param {Array} events
 * @returns {{ valid: Array, invalid: Array<{ event: unknown, error: string }> }}
 */
export function partitionEvents(events) {
  const valid = [];
  const invalid = [];
  if (!Array.isArray(events)) return { valid, invalid };
  for (const event of events) {
    const check = validateEvent(event);
    if (check.ok) valid.push(event);
    else invalid.push({ event, error: check.error });
  }
  return { valid, invalid };
}

/**
 * k-factor over time windows.
 *
 * Classic viral coefficient per bucket: converted invites (referred joins)
 * in the window divided by new signups in the window. Sustained K > 1
 * means the waitlist grows itself; K < 1 means it stalls without push.
 *
 * Bucket edges are UTC calendar days ('daily') or weeks ('weekly', Monday
 * start). Empty trailing buckets are omitted.
 *
 * @param {Array} events analytics events
 * @param {'daily' | 'weekly'} [window]
 * @returns {Array<{ windowStart: string, signups: number, invitesSent: number,
 *   invitesConverted: number, kFactor: number }>}
 */
export function kFactorOverWindows(events, window = 'daily') {
  const { valid } = partitionEvents(events);
  const bucketOf =
    window === 'weekly'
      ? (at) => {
          const d = new Date(at);
          const day = (d.getUTCDay() + 6) % 7; // Monday = 0
          const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
          return monday;
        }
      : (at) => {
          const d = new Date(at);
          return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        };

  const buckets = new Map();
  for (const e of valid) {
    const key = bucketOf(e.at);
    if (!buckets.has(key)) buckets.set(key, { signups: 0, invitesSent: 0, invitesConverted: 0 });
    const b = buckets.get(key);
    if (e.type === 'joined') b.signups += 1;
    if (e.type === 'invite_sent') b.invitesSent += 1;
    if (e.type === 'joined' && e.referredBy) b.invitesConverted += 1;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, b]) => ({
      windowStart: new Date(start).toISOString(),
      signups: b.signups,
      invitesSent: b.invitesSent,
      invitesConverted: b.invitesConverted,
      kFactor: b.signups === 0 ? 0 : b.invitesConverted / b.signups
    }));
}

/**
 * Referral conversion funnel: invite sent -> joined -> activated.
 *
 * @param {Array} events analytics events
 * @returns {{ invitesSent: number, joined: number, joinedViaReferral: number,
 *   activated: number, inviteToJoin: number, joinToActivated: number,
 *   endToEnd: number }}
 */
export function conversionFunnel(events) {
  const { valid } = partitionEvents(events);
  const invitesSent = valid.filter((e) => e.type === 'invite_sent').length;
  const joins = valid.filter((e) => e.type === 'joined');
  const joined = joins.length;
  const joinedViaReferral = joins.filter((e) => !!e.referredBy).length;
  const activated = valid.filter((e) => e.type === 'activated').length;
  return {
    invitesSent,
    joined,
    joinedViaReferral,
    activated,
    inviteToJoin: invitesSent === 0 ? 0 : joinedViaReferral / invitesSent,
    joinToActivated: joined === 0 ? 0 : activated / joined,
    endToEnd: invitesSent === 0 ? 0 : activated / invitesSent
  };
}

/**
 * Leaderboard of top referrers, with anti-gaming guards.
 *
 * Each credited join becomes an attribution record:
 * - self_referral: referredBy === the joiner's own referralCode — REJECTED,
 *   never credited.
 * - duplicate_account: joiner's canonical email matches the referrer's
 *   canonical email (plus/dot aliasing) — FLAGGED, untrusted.
 * - shared_ip / shared_device: two or more joiners credited to the same
 *   referrer share an IP or device fingerprint — FLAGGED, untrusted.
 *
 * Flagged attributions stay in the raw `credited` count but are excluded
 * from `trusted`, which is what the leaderboard ranks by. Flags are kept
 * on the entry for human review — nothing is silently dropped.
 *
 * @param {Array} events analytics events
 * @param {{ limit?: number, referrerEmails?: Record<string, string> }} [opts]
 *   referrerEmails maps a referral code to the referrer's signup email
 *   (used for the duplicate-account email check).
 * @returns {Array<{ code: string, credited: number, trusted: number,
 *   flags: string[], firstConversion: string | null }>}
 */
export function referralLeaderboard(events, opts = {}) {
  const { valid } = partitionEvents(events);
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : 25;
  const referrerEmails =
    opts.referrerEmails && typeof opts.referrerEmails === 'object' ? opts.referrerEmails : {};

  // 1. Collect credited joins per referrer code.
  const byCode = new Map();
  for (const e of valid) {
    if (e.type !== 'joined' || !e.referredBy) continue;
    const code = String(e.referredBy).trim().toUpperCase();
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push({
      email: canonicalEmail(e.email),
      ownCode: typeof e.referralCode === 'string' ? e.referralCode.trim().toUpperCase() : null,
      ip: typeof e.ip === 'string' ? e.ip.trim() : null,
      device: typeof e.device === 'string' ? e.device.trim() : null,
      at: e.at
    });
  }

  // 2. Score each referrer.
  const rows = [];
  for (const [code, joins] of byCode) {
    const flags = new Set();
    let trusted = 0;
    let firstConversion = null;
    const referrerCanonical = canonicalEmail(referrerEmails[code] ?? null);

    // Duplicate-signal clustering: count repeats per signal.
    const ipCounts = new Map();
    const deviceCounts = new Map();
    for (const j of joins) {
      if (j.ip) ipCounts.set(j.ip, (ipCounts.get(j.ip) || 0) + 1);
      if (j.device) deviceCounts.set(j.device, (deviceCounts.get(j.device) || 0) + 1);
    }

    for (const j of joins) {
      // Self-referral: rejected outright, never credited.
      if (j.ownCode && j.ownCode === code) {
        flags.add('self_referral');
        continue;
      }
      const joinFlags = [];
      if (referrerCanonical && j.email === referrerCanonical) {
        joinFlags.push('duplicate_account');
      }
      if (j.ip && ipCounts.get(j.ip) > 1) joinFlags.push('shared_ip');
      if (j.device && deviceCounts.get(j.device) > 1) joinFlags.push('shared_device');

      if (joinFlags.length === 0) {
        trusted += 1;
        if (firstConversion === null || j.at < firstConversion) firstConversion = j.at;
      }
      joinFlags.forEach((f) => flags.add(f));
    }

    rows.push({
      code,
      credited: joins.filter((j) => !(j.ownCode && j.ownCode === code)).length,
      trusted,
      flags: [...flags],
      firstConversion: firstConversion === null ? null : new Date(firstConversion).toISOString()
    });
  }

  // 3. Rank: trusted desc, then earliest first conversion, then code.
  rows.sort(
    (a, b) =>
      b.trusted - a.trusted ||
      (a.firstConversion === null ? 1 : b.firstConversion === null ? -1 : 0) ||
      (a.firstConversion < b.firstConversion ? -1 : a.firstConversion > b.firstConversion ? 1 : 0) ||
      (a.code < b.code ? -1 : 1)
  );

  return rows.slice(0, limit);
}

/**
 * One-shot summary for dashboards / the CLI: k-factor windows, funnel,
 * and leaderboard in a single pass.
 * @param {Array} events analytics events
 * @param {{ window?: 'daily' | 'weekly', limit?: number, referrerEmails?: object }} [opts]
 */
export function analyticsSummary(events, opts = {}) {
  const { valid, invalid } = partitionEvents(events);
  return {
    events: valid.length,
    eventsRejected: invalid.length,
    windows: kFactorOverWindows(valid, opts.window ?? 'daily'),
    funnel: conversionFunnel(valid),
    leaderboard: referralLeaderboard(valid, opts)
  };
}
