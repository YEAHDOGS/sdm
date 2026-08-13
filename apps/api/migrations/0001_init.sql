-- help: initial schema. All money columns are integer cents.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  roles TEXT NOT NULL DEFAULT 'viewer', -- comma-separated: viewer,donor,helper,admin
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE helper_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  approval TEXT NOT NULL DEFAULT 'pending', -- pending|approved|suspended|deactivated
  stripe_account_id TEXT,
  kyc_verified INTEGER NOT NULL DEFAULT 0,
  strikes INTEGER NOT NULL DEFAULT 0,
  missions_completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  geofence_radius_m INTEGER NOT NULL DEFAULT 150,
  receipt_hints TEXT NOT NULL DEFAULT '[]' -- JSON array of strings
);

CREATE TABLE safe_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  geofence_radius_m INTEGER NOT NULL DEFAULT 250,
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed|vetted|suspended
  active_start_hour INTEGER NOT NULL DEFAULT 8,
  active_end_hour INTEGER NOT NULL DEFAULT 19,
  vetting_notes TEXT
);

CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  safe_zone_id TEXT NOT NULL REFERENCES safe_zones(id),
  goods_cents INTEGER NOT NULL,
  helper_cents INTEGER NOT NULL,
  platform_cents INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES users(id),
  route_id TEXT NOT NULL REFERENCES routes(id),
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|succeeded|refunded|failed
  stripe_payment_intent_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id),
  donation_id TEXT NOT NULL UNIQUE REFERENCES donations(id),
  helper_id TEXT REFERENCES users(id),
  stream_id TEXT,
  state TEXT NOT NULL DEFAULT 'draft',
  receipt_key TEXT,
  receipt_total_cents INTEGER,
  claimed_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_missions_state ON missions(state);
CREATE INDEX idx_missions_helper ON missions(helper_id, state);

-- Append-only double-entry ledger. Money truth lives here (docs/payments.md).
CREATE TABLE ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT REFERENCES missions(id),
  account TEXT NOT NULL, -- donor_cash|donation_escrow|vendor_payable|helper_payable|platform_revenue
  direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ledger_mission ON ledger_entries(mission_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account);

CREATE TABLE streams (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL UNIQUE REFERENCES missions(id),
  helper_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'idle', -- idle|live|ended
  cf_live_input_id TEXT,
  playback_url TEXT,
  started_at TEXT,
  ended_at TEXT
);
CREATE INDEX idx_streams_status ON streams(status);

-- Cold storage of room events (chat/tips) flushed from StreamRoom DOs.
CREATE TABLE stream_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id TEXT NOT NULL REFERENCES streams(id),
  user_id TEXT,
  type TEXT NOT NULL, -- chat|cheer|tip|system
  payload TEXT NOT NULL, -- JSON
  ts INTEGER NOT NULL
);
CREATE INDEX idx_stream_events_stream ON stream_events(stream_id, ts);

CREATE TABLE tips (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id),
  tipper_id TEXT NOT NULL REFERENCES users(id),
  helper_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|succeeded|failed
  stripe_payment_intent_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tips_helper ON tips(helper_id, status);

CREATE TABLE follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  helper_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, helper_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT REFERENCES users(id),
  stream_id TEXT REFERENCES streams(id),
  mission_id TEXT REFERENCES missions(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open|actioned|dismissed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
