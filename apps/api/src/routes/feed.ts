import { Hono } from "hono";
import type { FeedItem } from "@help/shared";
import type { Env } from "../env";

export const feed = new Hono<{ Bindings: Env }>();

const FEED_CACHE_KEY = "feed:v1:global";
const FEED_CACHE_TTL_S = 60; // KV's minimum expirationTtl

/**
 * GET /v1/feed — live streams first, then recent VODs. KV-cached ~60s.
 * Ranking v1 is deliberately dumb (live > recency); see ARCHITECTURE.md §5.
 */
feed.get("/", async (c) => {
  const cached = await c.env.KV.get(FEED_CACHE_KEY, "json");
  if (cached) return c.json(cached);

  const { results } = await c.env.DB.prepare(
    `SELECT s.id AS stream_id, s.mission_id, s.status, s.playback_url, s.started_at,
            u.id AS helper_id, u.handle, u.display_name, u.avatar_url,
            r.title AS route_title, z.name AS zone_name,
            COALESCE((SELECT SUM(amount_cents) FROM tips t
                      WHERE t.stream_id = s.id AND t.status = 'succeeded'), 0) AS tip_total
     FROM streams s
     JOIN users u ON u.id = s.helper_id
     JOIN missions m ON m.id = s.mission_id
     JOIN routes r ON r.id = m.route_id
     JOIN safe_zones z ON z.id = r.safe_zone_id
     WHERE s.status IN ('live', 'ended')
     ORDER BY (s.status = 'live') DESC, s.started_at DESC
     LIMIT 25`
  ).all<{
    stream_id: string;
    mission_id: string;
    status: string;
    playback_url: string | null;
    started_at: string | null;
    helper_id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    route_title: string;
    zone_name: string;
    tip_total: number;
  }>();

  const items: FeedItem[] = await Promise.all(
    results.map(async (r) => {
      let viewerCount = 0;
      if (r.status === "live") {
        const room = c.env.STREAM_ROOM.get(c.env.STREAM_ROOM.idFromName(r.stream_id));
        const stats = await room
          .fetch(`https://do/rooms/${r.stream_id}/stats`)
          .then((res) => res.json() as Promise<{ viewers: number }>)
          .catch(() => ({ viewers: 0 }));
        viewerCount = stats.viewers;
      }
      return {
        streamId: r.stream_id,
        missionId: r.mission_id,
        helper: {
          id: r.helper_id,
          handle: r.handle,
          displayName: r.display_name,
          avatarUrl: r.avatar_url ?? undefined,
        },
        routeTitle: r.route_title,
        zoneName: r.zone_name,
        live: r.status === "live",
        playbackUrl: r.playback_url ?? undefined,
        viewerCount,
        tipTotalCents: r.tip_total,
        startedAt: r.started_at ?? undefined,
      };
    })
  );

  const payload = { items };
  await c.env.KV.put(FEED_CACHE_KEY, JSON.stringify(payload), {
    expirationTtl: FEED_CACHE_TTL_S,
  });
  return c.json(payload);
});
