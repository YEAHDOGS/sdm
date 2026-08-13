import { Hono } from "hono";
import { fundingLines, postEntries } from "../lib/ledger";
import type { Env } from "../env";

export const webhooks = new Hono<{ Bindings: Env }>();

/**
 * POST /v1/webhooks/stripe
 * The only place money-state advances from "pending". STRIPE SEAM: in
 * production, verify the `Stripe-Signature` header against
 * STRIPE_WEBHOOK_SECRET (WebCrypto HMAC-SHA256 over the raw body) before
 * trusting a byte of this payload. Dev accepts unsigned events for local flow.
 */
webhooks.post("/stripe", async (c) => {
  if (c.env.ENVIRONMENT !== "dev" && !c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "webhook secret not configured" }, 500);
  }
  // TODO(stripe): signature verification here for non-dev environments.

  const event = await c.req.json<{
    type: string;
    data: { object: { id: string; metadata?: Record<string, string> } };
  }>();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object.id;
    const donation = await c.env.DB.prepare(
      "SELECT id, total_cents FROM donations WHERE stripe_payment_intent_id = ? AND status = 'pending'"
    )
      .bind(pi)
      .first<{ id: string; total_cents: number }>();
    if (!donation) return c.json({ ok: true, note: "no pending donation for pi" });

    const mission = await c.env.DB.prepare(
      "SELECT id FROM missions WHERE donation_id = ? AND state = 'draft'"
    )
      .bind(donation.id)
      .first<{ id: string }>();

    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE donations SET status = 'succeeded' WHERE id = ?").bind(donation.id),
      c.env.DB.prepare("UPDATE missions SET state = 'open' WHERE donation_id = ? AND state = 'draft'").bind(
        donation.id
      ),
    ]);
    if (mission) {
      await postEntries(c.env.DB, mission.id, `fund:${pi}`, fundingLines(donation.total_cents));
    }
  }

  return c.json({ received: true });
});
