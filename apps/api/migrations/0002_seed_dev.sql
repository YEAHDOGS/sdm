-- Dev seed: one donor, one approved helper, a Little Caesars, a vetted zone,
-- and the flagship "$10 pizza run" route. Safe to apply only in dev/local.

INSERT INTO users (id, handle, display_name, email, roles) VALUES
  ('u_donor', 'firstdonor', 'First Donor', 'donor@example.com', 'viewer,donor'),
  ('u_helper', 'alexhelps', 'Alex H.', 'helper@example.com', 'viewer,helper'),
  ('u_admin', 'dogsadmin', 'DOGS Admin', 'admin@example.com', 'viewer,admin');

INSERT INTO helper_profiles (user_id, approval, kyc_verified) VALUES
  ('u_helper', 'approved', 1);

INSERT INTO vendors (id, name, lat, lng, geofence_radius_m, receipt_hints) VALUES
  ('v_lc_downtown', 'Little Caesars — Downtown', 34.0407, -118.2468, 150,
   '["LITTLE CAESARS","HOT-N-READY"]');

INSERT INTO safe_zones (id, name, lat, lng, geofence_radius_m, status,
                        active_start_hour, active_end_hour, vetting_notes) VALUES
  ('z_5th_st', '5th St corridor', 34.0430, -118.2440, 250, 'vetted', 8, 19,
   'Vetted with Downtown Outreach Coalition 2026-07. Daylight only.');

INSERT INTO routes (id, title, vendor_id, safe_zone_id, goods_cents, helper_cents, platform_cents) VALUES
  ('r_pizza_5th', '$10 pizza run — 5th St', 'v_lc_downtown', 'z_5th_st', 500, 400, 100);
