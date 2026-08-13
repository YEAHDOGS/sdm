import { Hono } from "hono";
import { assertValidSplit } from "@help/shared";
import type { Env } from "../env";
import { requireSession } from "../lib/auth";

export const donations = new Hono<{ Bindings: Env }>();

/**
 * POST /v1/donations { routeId }
 * Creates a pending donation + draft mission and returns a Stripe client
 * secret. The mission only becomes `open` when the payment webhook lands.
 */
donations.post("/", async (c) => {
  const session = await requireSession(c);
  const { routeId } = await c.req.json<{ routeId: string }>();

  const route = await c.env.DB.prepare(
    "SELECT id, goods_cents, helper_cents, platform_cents FROM routes WHERE id = ? AND active = 1"
  )
    .bind(routeId)
    .first<{ id: string; goods_cents: number; helper_cents: number; platform_cents: number }>();
  if (!route) return c.json({ error: "route not found" }, 404);

  const totalCents = route.goods_cents + route.helper_cents + route.platform_cents;
  assertValidSplit(
    {
      goodsCents: route.goods_cents,
      helperCents: route.helper_cents,
      platformCents: route.platform_cents,
    },
    totalCents
  );

  const donationId = crypto.randomUUID();
  const missionId = crypto.randomUUID();

  // STRIPE SEAM: create a real PaymentIntent(amount=totalCents) here and store
  // its id; dev returns a fake client secret so the clients can build the flow.
  const paymentIntentId = `pi_dev_${donationId}`;

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO donations (id, donor_id, route_id, total_cents, status, stripe_payment_intent_id)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).bind(donationId, session.userId, routeId, totalCents, paymentIntentId),
    c.env.DB.prepare(
      `INSERT INTO missions (id, route_id, donation_id, state) VALUES (?, ?, ?, 'draft')`
    ).bind(missionId, routeId, donationId),
  ]);

  return c.json({
    donationId,
    missionId,
    totalCents,
    clientSecret: `${paymentIntentId}_secret_dev`,
  });
});
