import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Job } from "./env";
import { donations } from "./routes/donations";
import { missions } from "./routes/missions";
import { streams } from "./routes/streams";
import { feed } from "./routes/feed";
import { webhooks } from "./routes/webhooks";
import { postEntries, settlementLines } from "./lib/ledger";

export { StreamRoom } from "./do/stream-room";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/", (c) => c.json({ service: "help-api", ok: true }));
app.route("/v1/donations", donations);
app.route("/v1/missions", missions);
app.route("/v1/streams", streams);
app.route("/v1/feed", feed);
app.route("/v1/webhooks", webhooks);

app.onError((err, c) => {
  const status = (err as { status?: number }).status ?? 500;
  if (status >= 500) console.error(err);
  return c.json({ error: err.message }, status as 401);
});

async function handleJob(env: Env, job: Job): Promise<void> {
  switch (job.type) {
    case "settle_mission": {
      const m = await env.DB.prepare(
        `SELECT m.id, m.state, r.goods_cents, r.helper_cents, r.platform_cents
         FROM missions m JOIN routes r ON r.id = m.route_id WHERE m.id = ?`
      )
        .bind(job.missionId)
        .first<{
          id: string;
          state: string;
          goods_cents: number;
          helper_cents: number;
          platform_cents: number;
        }>();
      if (!m || m.state !== "completed") return; // idempotent: replays no-op
      await postEntries(
        env.DB,
        m.id,
        `settle:${m.id}`,
        settlementLines(m.goods_cents, m.helper_cents, m.platform_cents)
      );
      await env.DB.prepare("UPDATE missions SET state = 'settled' WHERE id = ? AND state = 'completed'")
        .bind(m.id)
        .run();
      // STRIPE SEAM: enqueue payout_helper (daily batch transfer) here.
      break;
    }
    case "verify_receipt":
      // WORKERS AI SEAM: OCR the R2 object, match vendor hints + total,
      // flag the mission on mismatch. See docs/payments.md.
      break;
    case "payout_helper":
    case "moderate_stream_frame":
    case "notify":
      // Later milestones (ARCHITECTURE.md §10).
      break;
  }
}

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<Job>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await handleJob(env, msg.body);
        msg.ack();
      } catch (err) {
        console.error("job failed", msg.body, err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, Job>;
