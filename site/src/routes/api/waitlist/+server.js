import { validateSignup } from '$lib/waitlist.js';
import { json } from '@sveltejs/kit';

/**
 * STUB ENDPOINT — placeholder only, do NOT launch against this.
 *
 * This accepts waitlist signups and answers 202 but does not persist
 * anything. Before any public deploy, wire this to a real store
 * (Cloudflare D1/KV or the Dogs backend) and add rate limiting.
 *
 * POST body: { email, city?, scenes? } — validated by $lib/waitlist.js.
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

  // TODO: persist res.payload to the waitlist store before launch.
  return json({ status: 'queued' }, { status: 202 });
}
