import { validateSignup } from '$lib/waitlist.js';
import { isReferralCode, makeReferralCode, normalizeCode } from '$lib/referral.js';
import { json } from '@sveltejs/kit';

/**
 * STUB ENDPOINT — placeholder only, do NOT launch against this.
 *
 * This accepts waitlist signups and answers 202 but does not persist
 * anything. Before any public deploy, wire this to a real store
 * (Cloudflare D1/KV or the Dogs backend) and add rate limiting.
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

  let referredBy = null;
  if (body.referredBy !== undefined && body.referredBy !== null && String(body.referredBy).trim() !== '') {
    if (!isReferralCode(body.referredBy)) {
      return json({ error: 'That referral code doesn’t look right.' }, { status: 400 });
    }
    referredBy = normalizeCode(body.referredBy);
  }

  // TODO: persist res.payload + referralCode to the waitlist store before launch.
  // TODO: credit referredBy's referral count on store write (new email only).
  return json(
    { status: 'queued', referralCode: makeReferralCode(), referredBy },
    { status: 202 }
  );
}
