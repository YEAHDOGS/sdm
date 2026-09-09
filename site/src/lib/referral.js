/**
 * Waitlist referral loop for the sdm landing page (P1 #6).
 *
 * Pure module — zero framework dependencies, zero network — so it can be
 * shared by the client form and the /api/waitlist endpoint AND unit-tested
 * with plain `node --test` (no install needed).
 *
 * Mechanics:
 * - Every accepted signup gets a referral code (makeReferralCode).
 * - Codes use an unambiguous alphabet (no 0/O, 1/I, l) so they're
 *   typeable from a screenshot or a shout across a venue.
 * - Friends who sign up with ?ref=CODE credit the inviter's referral count
 *   (parseReferral extracts the code from a bare code or a full share URL).
 * - Queue jumping (rankQueue): each verified referral bumps the inviter up
 *   the waitlist — bounded so nobody games to the front instantly.
 * - viralStats gives the founder numbers for the loop: k-factor (viral
 *   coefficient), invites per signup, and invite→signup conversion rate.
 *
 * Anti-gaming notes:
 * - Self-referrals are a store-side concern (the signup store must credit
 *   a referral only when the invited email is new and verified).
 * - MAX_JUMP caps how far referrals can carry one signup, so early
 *   insiders can't permanently hold the front of the line.
 */

/** Referral code alphabet: no 0/O, 1/I/l — readable at arm's length. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

/** Queue jump: places gained per verified referral, and the hard cap. */
export const JUMP_PER_REFERRAL = 3;
export const MAX_JUMP = 25;

/**
 * Generate a fresh referral code.
 * Uses crypto.getRandomValues when available (browser, edge worker),
 * falls back to Math.random (plain node, tests).
 *
 * @param {number} [length] code length (default CODE_LENGTH)
 * @returns {string} the code
 */
export function makeReferralCode(length = CODE_LENGTH) {
  const n = Number.isInteger(length) && length > 0 ? length : CODE_LENGTH;
  const alpha = CODE_ALPHABET;
  const out = [];
  const rand = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? cryptoRandom(alpha.length)
    : () => Math.floor(Math.random() * alpha.length);
  for (let i = 0; i < n; i++) out.push(alpha[rand()]);
  return out.join('');
}

function cryptoRandom(range) {
  const buf = new Uint32Array(1);
  // Rejection-sample so the modulo below can't bias the draw.
  const limit = 0xffffffff - (0xffffffff % range);
  return () => {
    let v;
    do {
      crypto.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % range;
  };
}

/**
 * Check whether a value is a plausible referral code shape.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isReferralCode(value) {
  if (typeof value !== 'string') return false;
  const code = value.trim().toUpperCase();
  if (code.length < 4 || code.length > 32) return false;
  const ok = new Set(CODE_ALPHABET);
  return [...code].every((ch) => ok.has(ch));
}

/**
 * Normalize a code for storage/comparison.
 * @param {unknown} value
 * @returns {string | null} normalized code or null when invalid
 */
export function normalizeCode(value) {
  return isReferralCode(value) ? String(value).trim().toUpperCase() : null;
}

/**
 * Normalize the `referredBy` value of a waitlist signup for server use.
 *
 * Accepts a bare code ('ABCD2345'), a '?ref=CODE' query string, or a full
 * share URL — everything parseReferral understands — so pasting the whole
 * copied share link into an API client (or a curl body) doesn't 400.
 * Blank/missing input yields null (no referrer); the endpoint must 400 on
 * non-blank input that this rejects.
 *
 * @param {unknown} raw the raw referredBy value from the request body
 * @returns {string | null} normalized code, or null when blank/invalid
 */
export function extractReferredBy(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  return parseReferral(raw);
}

/**
 * Build a shareable referral link.
 * @param {string} code valid referral code
 * @param {string} base base URL, e.g. 'https://sdm.app'
 * @returns {string} full link with ?ref=
 * @throws {Error} on bad code or base
 */
export function shareLink(code, base) {
  const clean = normalizeCode(code);
  if (!clean) throw new Error('shareLink: invalid referral code.');
  if (typeof base !== 'string' || !/^https?:\/\//i.test(base.trim())) {
    throw new Error('shareLink: base must be an http(s) URL.');
  }
  const trimmed = base.trim().replace(/\/+$/, '');
  return `${trimmed}/?ref=${clean}`;
}

/**
 * Extract a referral code from a share URL, a query string, or a bare code.
 * @param {unknown} input e.g. 'https://sdm.app/?ref=ABCD2345', '?ref=ABCD2345', 'ABCD2345'
 * @returns {string | null} normalized code or null
 */
export function parseReferral(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (text === '') return null;
  if (isReferralCode(text)) return normalizeCode(text);
  const match = /[?&]ref=([A-Za-z0-9]+)/.exec(text);
  return match ? normalizeCode(match[1]) : null;
}

/**
 * Rank the waitlist with referral queue-jumping.
 *
 * Arrival order (joinedAt, then email for ties) is the baseline. Each
 * verified referral moves the inviter up by JUMP_PER_REFERRAL places,
 * capped at MAX_JUMP total places. The sort is stable on arrival order,
 * so equal effective scores keep first-come-first-served.
 *
 * @param {Array<{ email: string, joinedAt: number, referrals?: number }>} signups
 * @param {{ jumpPerReferral?: number, maxJump?: number }} [opts]
 * @returns {Array<{ email: string, joinedAt: number, referrals: number, position: number, jumped: number }>}
 */
export function rankQueue(signups, opts = {}) {
  if (!Array.isArray(signups)) return [];
  const jumpPer = opts.jumpPerReferral ?? JUMP_PER_REFERRAL;
  const maxJump = opts.maxJump ?? MAX_JUMP;

  const cleaned = signups
    .filter((s) => s && typeof s.email === 'string' && Number.isFinite(s.joinedAt))
    .map((s, arrivalIndex) => ({
      email: s.email,
      joinedAt: s.joinedAt,
      referrals: Math.max(0, Math.floor(Number(s.referrals) || 0)),
      arrivalIndex
    }))
    .sort((a, b) => a.joinedAt - b.joinedAt || (a.email < b.email ? -1 : a.email > b.email ? 1 : 0));

  const effective = (s) =>
    s.arrivalIndex - Math.min(s.referrals * jumpPer, maxJump);

  const ranked = [...cleaned].sort((a, b) => effective(a) - effective(b) || a.arrivalIndex - b.arrivalIndex);

  return ranked.map((s, i) => ({
    email: s.email,
    joinedAt: s.joinedAt,
    referrals: s.referrals,
    position: i + 1,
    jumped: Math.max(0, s.arrivalIndex - i)
  }));
}

/**
 * Founder numbers for the referral loop.
 *
 * kFactor is the classic viral coefficient: invites sent per signup times
 * invite→signup conversion = converted invites per signup. Sustained K > 1
 * means the waitlist grows itself; K < 1 means it stalls without paid push.
 *
 * @param {Array<{ invites?: number, referrals?: number }>} signups
 * @returns {{ signups: number, invitesSent: number, invitesConverted: number,
 *   invitesPerSignup: number, conversionRate: number, kFactor: number }}
 */
export function viralStats(signups) {
  if (!Array.isArray(signups) || signups.length === 0) {
    return {
      signups: 0,
      invitesSent: 0,
      invitesConverted: 0,
      invitesPerSignup: 0,
      conversionRate: 0,
      kFactor: 0
    };
  }
  const n = signups.length;
  const invitesSent = signups.reduce((t, s) => t + Math.max(0, Math.floor(Number(s?.invites) || 0)), 0);
  const invitesConverted = signups.reduce(
    (t, s) => t + Math.max(0, Math.floor(Number(s?.referrals) || 0)),
    0
  );
  return {
    signups: n,
    invitesSent,
    invitesConverted,
    invitesPerSignup: invitesSent / n,
    conversionRate: invitesSent === 0 ? 0 : invitesConverted / invitesSent,
    kFactor: invitesConverted / n
  };
}

/**
 * Share copy in the brand voice (see docs/VOICE.md): confident, playful,
 * zero cringe.
 * @param {string} code valid referral code
 * @param {{ city?: string }} [opts]
 * @returns {string}
 * @throws {Error} on bad code
 */
export function shareText(code, opts = {}) {
  const clean = normalizeCode(code);
  if (!clean) throw new Error('shareText: invalid referral code.');
  const city = typeof opts.city === 'string' && opts.city.trim() !== '' ? opts.city.trim() : null;
  const place = city ? ` in ${city}` : '';
  return (
    `I'm on the sdm waitlist${place} — first dibs on the app that matches you by music taste, not selfies. ` +
    `Skip the line with my link: ?ref=${clean}`
  );
}
