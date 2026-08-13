/**
 * The mission state machine. Single source of truth for what a mission may
 * do next — imported by the API (enforcement) and the clients (UI affordances)
 * so they can never disagree.
 */

export const MISSION_STATES = [
  "draft", // donation created, payment not yet confirmed
  "open", // funded, waiting for a helper
  "claimed", // helper accepted, heading to vendor
  "at_vendor", // geofence-confirmed at the vendor
  "purchased", // receipt uploaded and within goods budget
  "en_route", // driving to the safe zone
  "delivering", // inside the safe-zone geofence, live on stream
  "completed", // handout confirmed by helper
  "settled", // ledger settled, payout queued/sent
  "expired", // no helper claimed in time → refund
  "cancelled", // stopped before purchase → refund
  "flagged", // evidence anomaly or report → human review
] as const;

export type MissionState = (typeof MISSION_STATES)[number];

export const TERMINAL_STATES: readonly MissionState[] = ["settled", "expired", "cancelled"];

const TRANSITIONS: Record<MissionState, readonly MissionState[]> = {
  draft: ["open", "cancelled"],
  open: ["claimed", "expired", "cancelled"],
  claimed: ["at_vendor", "open", "cancelled"], // back to open = abandon/timeout
  at_vendor: ["purchased", "cancelled", "flagged"],
  purchased: ["en_route", "flagged"],
  en_route: ["delivering", "flagged"],
  delivering: ["completed", "flagged"],
  completed: ["settled", "flagged"],
  settled: [],
  expired: [],
  cancelled: [],
  flagged: ["open", "completed", "cancelled"], // human-review outcomes
};

export function canTransition(from: MissionState, to: MissionState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStates(from: MissionState): readonly MissionState[] {
  return TRANSITIONS[from];
}

/** Evidence the API demands before allowing a helper-driven transition. */
export interface CheckpointRule {
  /** must be inside this geofence */
  geofence?: "vendor" | "safe_zone";
  /** a receipt photo + total must accompany the request */
  receipt?: boolean;
  /** the mission's stream must currently be live */
  liveStream?: boolean;
}

export const CHECKPOINT_RULES: Partial<Record<MissionState, CheckpointRule>> = {
  at_vendor: { geofence: "vendor" },
  purchased: { geofence: "vendor", receipt: true },
  en_route: {},
  delivering: { geofence: "safe_zone", liveStream: true },
  completed: { geofence: "safe_zone", liveStream: true },
};

/** How long an open mission waits for a claim before auto-expiring. */
export const OPEN_TTL_MS = 2 * 60 * 60 * 1000;
/** How long a claim may sit without reaching the vendor before re-opening. */
export const CLAIM_TTL_MS = 30 * 60 * 1000;
