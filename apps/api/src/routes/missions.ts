import { Hono } from "hono";
import {
  CHECKPOINT_RULES,
  canTransition,
  type MissionState,
} from "@help/shared";
import type { Env } from "../env";
import { requireSession } from "../lib/auth";
import { bboxAround, withinRadius } from "../lib/geo";

export const missions = new Hono<{ Bindings: Env }>();

interface MissionRow {
  id: string;
  state: MissionState;
  helper_id: string | null;
  route_id: string;
  goods_cents: number;
  helper_cents: number;
  platform_cents: number;
  vendor_lat: number;
  vendor_lng: number;
  vendor_radius: number;
  zone_lat: number;
  zone_lng: number;
  zone_radius: number;
  zone_status: string;
  active_start_hour: number;
  active_end_hour: number;
  stream_id: string | null;
}

const MISSION_JOIN = `
  SELECT m.id, m.state, m.helper_id, m.route_id, m.stream_id,
         r.goods_cents, r.helper_cents, r.platform_cents,
         v.lat AS vendor_lat, v.lng AS vendor_lng, v.geofence_radius_m AS vendor_radius,
         z.lat AS zone_lat, z.lng AS zone_lng, z.geofence_radius_m AS zone_radius,
         z.status AS zone_status, z.active_start_hour, z.active_end_hour
  FROM missions m
  JOIN routes r ON r.id = m.route_id
  JOIN vendors v ON v.id = r.vendor_id
  JOIN safe_zones z ON z.id = r.safe_zone_id`;

/** GET /v1/missions/open?lat=&lng=&radiusM= — claimable missions near the helper. */
missions.get("/open", async (c) => {
  await requireSession(c);
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  const radiusM = Math.min(Number(c.req.query("radiusM") ?? 8000), 25000);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return c.json({ error: "lat/lng required" }, 400);
  }

  const box = bboxAround({ lat, lng }, radiusM);
  const { results } = await c.env.DB.prepare(
    `${MISSION_JOIN}
     WHERE m.state = 'open' AND z.status = 'vetted'
       AND v.lat BETWEEN ? AND ? AND v.lng BETWEEN ? AND ?
     LIMIT 50`
  )
    .bind(box.minLat, box.maxLat, box.minLng, box.maxLng)
    .all<MissionRow>();

  const nearby = results.filter((m) =>
    withinRadius({ lat: m.vendor_lat, lng: m.vendor_lng }, { lat, lng }, radiusM)
  );
  return c.json({ missions: nearby });
});

/** POST /v1/missions/:id/claim */
missions.post("/:id/claim", async (c) => {
  const session = await requireSession(c);
  const id = c.req.param("id");

  const helper = await c.env.DB.prepare(
    "SELECT approval FROM helper_profiles WHERE user_id = ?"
  )
    .bind(session.userId)
    .first<{ approval: string }>();
  if (helper?.approval !== "approved") {
    return c.json({ error: "helper not approved" }, 403);
  }

  // Atomic claim: only wins if the mission is still open.
  const res = await c.env.DB.prepare(
    `UPDATE missions SET state = 'claimed', helper_id = ?, claimed_at = datetime('now')
     WHERE id = ? AND state = 'open'`
  )
    .bind(session.userId, id)
    .run();
  if (res.meta.changes === 0) {
    return c.json({ error: "mission not claimable" }, 409);
  }
  return c.json({ ok: true, missionId: id, state: "claimed" });
});

/**
 * POST /v1/missions/:id/checkpoint { to, lat, lng, receiptKey?, receiptTotalCents? }
 * The only way a helper advances a mission. Enforces the shared state machine
 * plus the evidence rules (geofence / receipt / live stream).
 */
missions.post("/:id/checkpoint", async (c) => {
  const session = await requireSession(c);
  const id = c.req.param("id");
  const body = await c.req.json<{
    to: MissionState;
    lat: number;
    lng: number;
    receiptKey?: string;
    receiptTotalCents?: number;
  }>();

  const m = await c.env.DB.prepare(`${MISSION_JOIN} WHERE m.id = ?`)
    .bind(id)
    .first<MissionRow>();
  if (!m) return c.json({ error: "mission not found" }, 404);
  if (m.helper_id !== session.userId) return c.json({ error: "not your mission" }, 403);
  if (!canTransition(m.state, body.to)) {
    return c.json({ error: `cannot go ${m.state} → ${body.to}` }, 409);
  }

  const rule = CHECKPOINT_RULES[body.to];
  if (rule?.geofence) {
    const target =
      rule.geofence === "vendor"
        ? { center: { lat: m.vendor_lat, lng: m.vendor_lng }, radius: m.vendor_radius }
        : { center: { lat: m.zone_lat, lng: m.zone_lng }, radius: m.zone_radius };
    if (!withinRadius({ lat: body.lat, lng: body.lng }, target.center, target.radius)) {
      return c.json({ error: `outside ${rule.geofence} geofence` }, 422);
    }
    if (rule.geofence === "safe_zone") {
      // TODO(zones): convert to the zone's local timezone; UTC hour is a placeholder.
      const hour = new Date().getUTCHours();
      if (hour < m.active_start_hour || hour >= m.active_end_hour) {
        return c.json({ error: "safe zone outside active hours" }, 422);
      }
    }
  }

  if (rule?.receipt) {
    if (!body.receiptKey || !Number.isInteger(body.receiptTotalCents)) {
      return c.json({ error: "receipt required" }, 422);
    }
    if (body.receiptTotalCents! > m.goods_cents) {
      return c.json({ error: "receipt exceeds goods budget" }, 422);
    }
  }

  if (rule?.liveStream) {
    const s = await c.env.DB.prepare("SELECT status FROM streams WHERE mission_id = ?")
      .bind(id)
      .first<{ status: string }>();
    if (s?.status !== "live") {
      return c.json({ error: "stream must be live for this step" }, 422);
    }
  }

  await c.env.DB.prepare(
    `UPDATE missions SET state = ?,
       receipt_key = COALESCE(?, receipt_key),
       receipt_total_cents = COALESCE(?, receipt_total_cents),
       completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
     WHERE id = ?`
  )
    .bind(body.to, body.receiptKey ?? null, body.receiptTotalCents ?? null, body.to, id)
    .run();

  if (body.to === "purchased" && body.receiptKey) {
    await c.env.JOBS.send({ type: "verify_receipt", missionId: id, receiptKey: body.receiptKey });
  }
  if (body.to === "completed") {
    await c.env.JOBS.send({ type: "settle_mission", missionId: id });
  }

  return c.json({ ok: true, missionId: id, state: body.to });
});
