import type { MissionState } from "./mission";

export type Id = string;

export type Role = "viewer" | "donor" | "helper" | "admin";

export interface User {
  id: Id;
  handle: string;
  displayName: string;
  roles: Role[];
  avatarUrl?: string;
  createdAt: string;
}

export type HelperApproval = "pending" | "approved" | "suspended" | "deactivated";

export interface HelperProfile {
  userId: Id;
  approval: HelperApproval;
  stripeAccountId?: string;
  kycVerified: boolean;
  strikes: number;
  missionsCompleted: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Vendor {
  id: Id;
  name: string;
  location: GeoPoint;
  geofenceRadiusM: number;
  /** substrings expected on a receipt from this vendor, for OCR matching */
  receiptHints: string[];
}

export type SafeZoneStatus = "proposed" | "vetted" | "suspended";

export interface SafeZone {
  id: Id;
  name: string;
  location: GeoPoint;
  geofenceRadiusM: number;
  status: SafeZoneStatus;
  /** local hours, e.g. { startHour: 8, endHour: 19 } — deliveries allowed inside only */
  activeHours: { startHour: number; endHour: number };
  vettingNotes?: string;
}

export interface Route {
  id: Id;
  title: string;
  vendorId: Id;
  safeZoneId: Id;
  goodsCents: number;
  helperCents: number;
  platformCents: number;
  active: boolean;
}

export type DonationStatus = "pending" | "succeeded" | "refunded" | "failed";

export interface Donation {
  id: Id;
  donorId: Id;
  routeId: Id;
  totalCents: number;
  status: DonationStatus;
  stripePaymentIntentId?: string;
  createdAt: string;
}

export interface Mission {
  id: Id;
  routeId: Id;
  donationId: Id;
  helperId?: Id;
  streamId?: Id;
  state: MissionState;
  receiptKey?: string;
  receiptTotalCents?: number;
  claimedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export type StreamStatus = "idle" | "live" | "ended";

export interface Stream {
  id: Id;
  missionId: Id;
  helperId: Id;
  status: StreamStatus;
  /** Cloudflare Stream live input uid */
  cfLiveInputId?: string;
  /** playback (HLS) url once live/recorded */
  playbackUrl?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface FeedItem {
  streamId: Id;
  missionId: Id;
  helper: Pick<User, "id" | "handle" | "displayName" | "avatarUrl">;
  routeTitle: string;
  zoneName: string;
  live: boolean;
  playbackUrl?: string;
  viewerCount: number;
  tipTotalCents: number;
  startedAt?: string;
}

/** Messages flowing over a StreamRoom WebSocket (client ⇄ Durable Object). */
export type RoomClientMessage =
  | { type: "chat"; text: string }
  | { type: "cheer"; emoji: string };

export type RoomServerMessage =
  | { type: "chat"; userId: Id; name: string; text: string; ts: number }
  | { type: "cheer"; userId: Id; emoji: string; ts: number }
  | { type: "tip"; userId: Id; name: string; amountCents: number; ts: number }
  | { type: "viewers"; count: number }
  | { type: "system"; text: string; ts: number };
