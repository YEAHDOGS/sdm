import { Hono } from "hono";
import type { Env } from "../env";
import { requireSession } from "../lib/auth";

export const streams = new Hono<{ Bindings: Env }>();

/**
 * POST /v1/streams { missionId }
 * Called by the helper app before going live. Creates the stream row and a
 * Cloudflare Stream live input (RTMPS + WHIP ingest), returning ingest info.
 */
streams.post("/", async (c) => {
  const session = await requireSession(c);
  const { missionId } = await c.req.json<{ missionId: string }>();

  const mission = await c.env.DB.prepare(
    "SELECT id, helper_id, state FROM missions WHERE id = ?"
  )
    .bind(missionId)
    .first<{ id: string; helper_id: string | null; state: string }>();
  if (!mission) return c.json({ error: "mission not found" }, 404);
  if (mission.helper_id !== session.userId) return c.json({ error: "not your mission" }, 403);

  const streamId = crypto.randomUUID();
  let cfLiveInputId = `li_dev_${streamId}`;
  let rtmpsUrl = "rtmps://live.cloudflare.com:443/live/";
  let rtmpsKey = `dev_${streamId}`;
  let whipUrl = `https://customer-dev.cloudflarestream.com/${cfLiveInputId}/webRTC/publish`;

  // CLOUDFLARE STREAM SEAM: real call when credentials are configured.
  if (c.env.CF_STREAM_ACCOUNT_ID && c.env.CF_STREAM_API_TOKEN) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_STREAM_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.CF_STREAM_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta: { missionId, streamId },
          recording: { mode: "automatic", timeoutSeconds: 30 },
        }),
      }
    );
    const data = (await res.json()) as {
      result: {
        uid: string;
        rtmps: { url: string; streamKey: string };
        webRTC: { url: string };
      };
    };
    cfLiveInputId = data.result.uid;
    rtmpsUrl = data.result.rtmps.url;
    rtmpsKey = data.result.rtmps.streamKey;
    whipUrl = data.result.webRTC.url;
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO streams (id, mission_id, helper_id, status, cf_live_input_id)
       VALUES (?, ?, ?, 'idle', ?)`
    ).bind(streamId, missionId, session.userId, cfLiveInputId),
    c.env.DB.prepare("UPDATE missions SET stream_id = ? WHERE id = ?").bind(streamId, missionId),
  ]);

  return c.json({ streamId, ingest: { rtmpsUrl, rtmpsKey, whipUrl } });
});

/**
 * POST /v1/streams/:id/status { status: "live" | "ended" }
 * Dev hook; production wires Cloudflare Stream's webhook to this transition
 * (live_input.connected / disconnected) so "live" can't be spoofed by clients.
 */
streams.post("/:id/status", async (c) => {
  const session = await requireSession(c);
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: "live" | "ended" }>();
  if (status !== "live" && status !== "ended") return c.json({ error: "bad status" }, 400);

  const res = await c.env.DB.prepare(
    `UPDATE streams SET status = ?,
       started_at = CASE WHEN ? = 'live' THEN datetime('now') ELSE started_at END,
       ended_at   = CASE WHEN ? = 'ended' THEN datetime('now') ELSE ended_at END
     WHERE id = ? AND helper_id = ?`
  )
    .bind(status, status, status, id, session.userId)
    .run();
  if (res.meta.changes === 0) return c.json({ error: "stream not found" }, 404);
  return c.json({ ok: true });
});

/** GET /v1/streams/:id/ws — upgrade and hand the socket to the StreamRoom DO. */
streams.get("/:id/ws", async (c) => {
  const id = c.req.param("id");
  const session = await requireSession(c).catch(() => null); // anonymous viewers allowed
  const room = c.env.STREAM_ROOM.get(c.env.STREAM_ROOM.idFromName(id));

  const url = new URL(c.req.url);
  url.pathname = `/rooms/${id}/ws`;
  if (session) {
    url.searchParams.set("userId", session.userId);
    const user = await c.env.DB.prepare("SELECT display_name FROM users WHERE id = ?")
      .bind(session.userId)
      .first<{ display_name: string }>();
    if (user) url.searchParams.set("name", user.display_name);
  }
  return room.fetch(new Request(url, c.req.raw));
});

/**
 * POST /v1/streams/:id/tip { amountCents }
 * Dev flow confirms instantly; production creates a PaymentIntent and the
 * Stripe webhook performs the confirm + room broadcast.
 */
streams.post("/:id/tip", async (c) => {
  const session = await requireSession(c);
  const id = c.req.param("id");
  const { amountCents } = await c.req.json<{ amountCents: number }>();
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 50_000) {
    return c.json({ error: "tip must be $1–$500" }, 400);
  }

  const stream = await c.env.DB.prepare("SELECT helper_id FROM streams WHERE id = ?")
    .bind(id)
    .first<{ helper_id: string }>();
  if (!stream) return c.json({ error: "stream not found" }, 404);

  const tipId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO tips (id, stream_id, tipper_id, helper_id, amount_cents, status)
     VALUES (?, ?, ?, ?, ?, 'succeeded')` // STRIPE SEAM: 'pending' until webhook in prod
  )
    .bind(tipId, id, session.userId, stream.helper_id, amountCents)
    .run();

  const user = await c.env.DB.prepare("SELECT display_name FROM users WHERE id = ?")
    .bind(session.userId)
    .first<{ display_name: string }>();
  const room = c.env.STREAM_ROOM.get(c.env.STREAM_ROOM.idFromName(id));
  await room.fetch(`https://do/rooms/${id}/event`, {
    method: "POST",
    body: JSON.stringify({
      type: "tip",
      userId: session.userId,
      name: user?.display_name ?? "someone",
      amountCents,
      ts: Date.now(),
    }),
  });

  return c.json({ ok: true, tipId });
});
