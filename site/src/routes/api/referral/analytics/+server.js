import { analyticsSummary } from '$lib/analytics.js';
import { json } from '@sveltejs/kit';

/**
 * Referral analytics endpoint (P1 #6).
 *
 * Pure computation over an event batch — no store access yet. When the
 * waitlist store lands (P1 #4), this becomes a GET over stored events; the
 * module contract (events array -> analyticsSummary) stays the same.
 *
 * POST body: { events: [...], window?: 'daily'|'weekly', limit?: number }
 *   event shapes are validated by $lib/analytics.js; invalid events are
 *   reported in `eventsRejected`, never silently dropped.
 */
export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.events)) {
    return json({ error: 'Body needs an `events` array.' }, { status: 400 });
  }

  const window = body.window === undefined || body.window === null ? 'daily' : body.window;
  if (window !== 'daily' && window !== 'weekly') {
    return json({ error: "window must be 'daily' or 'weekly'." }, { status: 400 });
  }

  const limit =
    body.limit === undefined || body.limit === null
      ? 25
      : Math.max(1, Math.floor(Number(body.limit) || 25));

  const summary = analyticsSummary(body.events, { window, limit });
  return json(summary, { status: 200 });
}
