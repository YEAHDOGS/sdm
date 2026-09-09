/**
 * Abuse guards for the waitlist + referral loop (P1 #6 hardening).
 *
 * Pure module — zero framework dependencies, zero network — shared by the
 * /api/waitlist endpoint and unit-tested with plain `node --test`
 * (no install needed).
 *
 * What this covers (enforced in the endpoint, not just flagged in
 * analytics — see site/src/lib/analytics.js for the flagging side):
 * - Self-referral: a signup credited by its OWN code (re-signups trying
 *   to farm queue jumps) is rejected at 400.
 * - Rate limiting: in-memory sliding-window caps per client IP and per
 *   email on the signup endpoint. This is a per-process guard — real
 *   multi-instance deploys need a shared counter (Cloudflare KV/D1) in
 *   the persistence layer, but it kills naive bot floods today.
 *
 * Store-side rules that CANNOT be enforced until the real persistence
 * layer lands (P1 #4 stub — the endpoint still answers 202 and persists
 * nothing): referral crediting only for new emails, no double-counting of
 * the same invited email, shared-IP/device joins. Those stay as
 * analytics.js flags until then.
 */

import { extractReferredBy, normalizeCode } from './referral.js';

/** Default rate limits: window (ms) → max hits inside that window. */
export const IP_RATE_LIMITS = [
  { windowMs: 10 * 60 * 1000, max: 5 }, // 5 signups / 10 min per IP
  { windowMs: 24 * 60 * 60 * 1000, max: 30 } // 30 signups / 24 h per IP
];
export const EMAIL_RATE_LIMITS = [
  { windowMs: 60 * 60 * 1000, max: 3 } // 3 attempts / hour per email
];

/**
 * In-memory sliding-window rate limiter.
 *
 * Keys map to timestamp lists (ms). `now` is injectable so tests can
 * advance time deterministically; default is Date.now().
 *
 * @example
 * const limiter = new RateLimiter(IP_RATE_LIMITS);
 * const res = limiter.hit('1.2.3.4');   // { ok: true }
 * if (!res.ok) return 429 retryAfterMs …
 */
export class RateLimiter {
  /**
   * @param {Array<{ windowMs: number, max: number }>} limits
   * @param {() => number} [nowFn]
   */
  constructor(limits, nowFn) {
    if (!Array.isArray(limits) || limits.length === 0) {
      throw new Error('RateLimiter: limits must be a non-empty array.');
    }
    for (const l of limits) {
      if (!Number.isFinite(l?.windowMs) || l.windowMs <= 0 || !Number.isInteger(l?.max) || l.max <= 0) {
        throw new Error('RateLimiter: each limit needs a positive windowMs and integer max.');
      }
    }
    this.limits = limits.map((l) => ({ windowMs: l.windowMs, max: l.max }));
    this.nowFn = typeof nowFn === 'function' ? nowFn : () => Date.now();
    /** @type {Map<string, number[]>} */
    this.hits = new Map();
  }

  /** Record a hit when allowed: check + record. */
  hit(key, now) {
    const t = now ?? this.nowFn();
    const check = this.check(key, t);
    if (!check.ok) return check;
    if (!this.hits.has(key)) this.hits.set(key, []);
    this.hits.get(key).push(t);
    this.pruneKey(key, t);
    return { ok: true };
  }

  /** Check without recording. */
  check(key, now) {
    const t = now ?? this.nowFn();
    const list = this.pruneKey(key, t);
    for (const limit of this.limits) {
      const count = list.filter((ts) => ts > t - limit.windowMs).length;
      if (count >= limit.max) {
        const oldest = Math.min(...list);
        return {
          ok: false,
          retryAfterMs: Math.max(0, oldest + limit.windowMs - t),
          limit
        };
      }
    }
    return { ok: true };
  }

  /** Drop expired timestamps for a key (returns the pruned list). */
  pruneKey(key, now) {
    const t = now ?? this.nowFn();
    const list = this.hits.get(key);
    if (!list) return [];
    const maxWindow = Math.max(...this.limits.map((l) => l.windowMs));
    const kept = list.filter((ts) => ts > t - maxWindow);
    if (kept.length === 0) this.hits.delete(key);
    else this.hits.set(key, kept);
    return kept;
  }

  /** Drop expired entries across all keys. */
  purge(now) {
    const t = now ?? this.nowFn();
    for (const key of [...this.hits.keys()]) this.pruneKey(key, t);
    return this;
  }

  /** Forget every key (tests, admin reset). */
  reset() {
    this.hits.clear();
    return this;
  }

  /** Number of tracked keys. */
  get size() {
    return this.hits.size;
  }
}

/**
 * Extract the client IP from request headers.
 *
 * Accepts anything with a `.get(name)` (SvelteKit's Headers included).
 * Trusts platform proxy headers: Cloudflare's cf-connecting-ip first,
 * then the left-most x-forwarded-for entry, then x-real-ip.
 * Normalizes whitespace/case; returns null when nothing usable is found.
 *
 * @param {{ get(name: string): string | null }} headers
 * @returns {string | null}
 */
export function getClientIp(headers) {
  if (!headers || typeof headers.get !== 'function') return null;
  const direct = headers.get('cf-connecting-ip');
  if (direct && direct.trim() !== '') return direct.trim().toLowerCase();
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim() !== '') {
    const first = forwarded.split(',')[0].trim();
    if (first !== '') return first.toLowerCase();
  }
  const real = headers.get('x-real-ip');
  if (real && real.trim() !== '') return real.trim().toLowerCase();
  return null;
}

/**
 * Is this signup trying to credit its own referral code?
 *
 * The client ships its previously-issued code (`ownCode`, from
 * localStorage) with re-signups; the endpoint rejects referredBy === ownCode.
 * Case/format-insensitive via normalizeCode. Null-safe: any blank or
 * invalid side yields false (invalid codes are rejected elsewhere).
 *
 * @param {unknown} ownCode the signup's own referral code (if any)
 * @param {unknown} referredBy the referrer code on this signup
 * @returns {boolean}
 */
export function isSelfReferral(ownCode, referredBy) {
  const own = normalizeCode(ownCode);
  const ref = normalizeCode(referredBy);
  return own !== null && ref !== null && own === ref;
}

/**
 * Decide whether a referral should be credited for a signup.
 *
 * Pure rule check the store layer re-uses on real wiring (P1 #4): credit
 * only when the code is valid and not the signup's own. Returns a
 * machine-readable reason so callers map cleanly to status codes.
 *
 * @param {{ ownCode?: unknown, referredBy?: unknown }} input
 * @returns {{ ok: true, code: string | null } | { ok: false, reason: 'invalid-code' | 'self-referral' }}
 */
export function classifyReferral({ ownCode, referredBy } = {}) {
  if (referredBy === undefined || referredBy === null || String(referredBy).trim() === '') {
    return { ok: true, code: null };
  }
  // extractReferredBy keeps the endpoint's leniency: bare codes, '?ref=CODE',
  // and full pasted share URLs all normalize here.
  const code = extractReferredBy(referredBy);
  if (!code) return { ok: false, reason: 'invalid-code' };
  if (isSelfReferral(ownCode, code)) return { ok: false, reason: 'self-referral' };
  return { ok: true, code };
}
