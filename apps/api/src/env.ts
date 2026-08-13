export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  KV: KVNamespace;
  JOBS: Queue<Job>;
  STREAM_ROOM: DurableObjectNamespace;

  ENVIRONMENT: "dev" | "staging" | "production";

  // secrets
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  CF_STREAM_ACCOUNT_ID?: string;
  CF_STREAM_API_TOKEN?: string;
  SESSION_JWT_SECRET?: string;
}

/** Async work pushed to the help-jobs Queue. */
export type Job =
  | { type: "verify_receipt"; missionId: string; receiptKey: string }
  | { type: "settle_mission"; missionId: string }
  | { type: "payout_helper"; helperId: string }
  | { type: "moderate_stream_frame"; streamId: string; frameKey: string }
  | { type: "notify"; userId: string; title: string; body: string };
