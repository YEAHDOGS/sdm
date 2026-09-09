import { validateSignup } from '$lib/waitlist.js';
import { makeReferralCode } from '$lib/referral.js';
import { EMAIL_RATE_LIMITS, IP_RATE_LIMITS, RateLimiter, classifyReferral, getClientIp } from '$lib/abuseGuards.js';
import { json } from '@sveltejs/kit';

// Per-process abuse guards (see $lib/abuseGuards.js). The real persistence
// layer (P1 #4) must back these with shared counters (KV/D1) when it lands;
// until then this stops single-instance bot floods, not distributed ones.
const ipLimiter = new RateLimiter(IP_RATE_LIMITS);
const emailLimiter = new RateLimiter(EMAIL_RATE_LIMITS);

/**
 * STUB ENDPOINT — placeholder only, do NOT launch against this.
 *
 * This accepts waitlist signups and answers 202 but does not persist
 * anything. Before any public deploy, wire this to a real store
 * (Cloudflare D1/KV or the Dogs backend); the in-memory rate limits below
 * must move to shared counters at the same time.
 *
 * POST body: { email, city?, scenes?, referredBy? } — validated by
 * $lib/waitlist.js and $lib/referral.js.
 *
 * The store must, on real wiring:
 * - save email + a fresh referral code (makeReferralCode),
 * - credit the inviter's referral count ONLY when the invited email is
 *   new and verified (no self-referrals, no double-counting).
 */
export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const res = validateSignup(body);
  if (!res.ok) {
    return json({ error: res.error }, { status: 400 });
  }

  // Abuse guards — rate limit first so floods burn out cheap.
  const ip = getClientIp(request.headers) ?? 'unknown';
  const ipHit = ipLimiter.hit(`waitlist:${ip}`);
  if (!ipHit.ok) {
    return json(
      { error: 'Too many signups from your connection — give it a beat and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(ipHit.retryAfterMs / 1000)) }
      }
    );
  }
  const emailKey = res.payload.email.toLowerCase();
  const emailHit = emailLimiter.hit(`waitlist:email:${emailKey}`);
  if (!emailHit.ok) {
    return json(
      { error: 'This email just tried to join — check your inbox or wait before retrying.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(emailHit.retryAfterMs / 1000)) }
      }
    );
  }

  // Referral credit decision: valid + not the signup's own code.
  // The client ships ownCode (its previously-issued code, if any) so a
  // re-signup can't farm queue jumps off itself.
  const decision = classifyReferral({ ownCode: body.ownCode, referredBy: body.referredBy });
  if (!decision.ok) {
    const error =
      decision.reason === 'self-referral'
        ? 'You can’t refer yourself — share your link with a friend instead.'
        : 'That referral code doesn’t look right.';
    return json({ error }, { status: 400 });
  }
  const referredBy = decision.code;

  // TODO: persist res.payload + referralCode to the waitlist store before launch.
  // TODO: credit referredBy's referral count on store write (new email only,
  // no self-referrals — re-run classifyReferral + isSelfReferral at write time).
  return json(
    { status: 'queued', referralCode: makeReferralCode(), referredBy },
    { status: 202 }
  );
}
