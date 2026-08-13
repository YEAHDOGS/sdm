# Payments & the ledger

## The split

All money is integer **cents**. A route defines its price card; the default "$10 pizza run":

| Leg | Amount | Account |
|---|---|---|
| Goods (vendor) | 500 | `vendor_payable` |
| Helper fee | 400 | `helper_payable` |
| Platform (DOGS) | 100 | `platform_revenue` |
| **Donation total** | **1000** | — |

`packages/shared/src/money.ts` owns this math and asserts `goods + helper + platform === total` at donation-creation time. There is no floating point anywhere in the money path.

## Double-entry ledger (D1, source of truth)

Stripe moves money; **our ledger says what the money means**. Append-only `ledger_entries`, every mission producing balanced pairs:

**On payment confirmed (mission → `open`):**

```
debit  donor_cash        1000        credit  donation_escrow   1000
```

**On settlement (mission → `settled`):**

```
debit  donation_escrow    500        credit  vendor_payable     500
debit  donation_escrow    400        credit  helper_payable     400
debit  donation_escrow    100        credit  platform_revenue   100
```

Escrow always zeroes out per mission. Any nonzero escrow balance on a terminal mission is an alert, not a rounding note.

## MVP flow: receipt reimbursement

Helpers front the goods cost at the vendor, photograph the receipt, and get **$9** at settlement ($5 reimbursement + $4 fee). Why this first:

- Zero integration with vendors — any Little Caesars on Earth works day one.
- One payout per mission (simple Stripe Transfer to the helper's Connect account).
- The receipt is the fraud-control artifact anyway.

Receipt verification (Queue consumer): Workers AI OCR extracts vendor name + total → must match the route's vendor hints and be ≤ `goods_cents` → mismatch flags the mission for human review instead of settling.

Downsides, accepted for MVP: helpers need $5 of float; over-budget purchases are the helper's problem (spend $5.40, eat $0.40 — stated clearly in the helper TOS).

## v2 flow: Stripe Issuing virtual cards

Per-mission single-use virtual card, funded at exactly `goods_cents`, locked to the vendor's merchant category, expiring 2h after claim. Helpers front nothing; the card decline *is* the fraud control; the Issuing authorization webhook replaces receipt OCR as primary evidence (receipt photo stays as backup). This is the flagship UX ("we hand you the money") and worth the Issuing onboarding once volume justifies it.

## Stripe wiring

- **Donations**: PaymentIntent on the platform account. Mission goes `draft` → `open` only on the `payment_intent.succeeded` **webhook** (never trust the client). Card fees (~2.9% + 30¢ ≈ 59¢ on $10) are offered to the donor as an opt-in "cover the fees" add-on, defaulted on; if declined, fees come out of the platform's $1.
- **Helpers**: Connect **Express** accounts — Stripe hosts KYC/onboarding, we store `stripe_account_id` + capability status in `helper_profiles`. Payout = one Transfer per settled mission (batched daily per helper to cut per-transfer overhead), then Stripe's normal payout cadence to their bank.
- **Vendors**: MVP pays vendors implicitly via the helper's at-register purchase. A future vendor-partnership tier (pre-negotiated pricing, direct Transfers) rides on the same route price card.
- **Tips**: separate PaymentIntent, **100% to the helper** minus card processing (shown at tip time: "$2.00 tip → $1.71 to Alex"). Tips ledger to `helper_payable` immediately on webhook and ride the same daily transfer batch. Platform takes nothing on tips — that's a product stance, keep it.
- **Refunds**: mission `expired`/`cancelled` before purchase → full refund to donor. Cancelled after purchase (rare, flagged path) → human decision; ledger supports partial reversal entries.

## Idempotency & failure

- Every Stripe webhook handler and every Queue payout job is idempotent, keyed on `mission_id` + event type; ledger inserts use unique keys so replays no-op.
- Payout jobs that fail retry via Queue redelivery; a mission stuck in `completed` > 24h pages a human.
- Nightly cron reconciles ledger balances against Stripe's balance transactions; drift → alert.

## Fraud controls (money-side)

- Helper caps: N missions/day and $X outstanding until trust is earned.
- Geofence + receipt + live-stream evidence must *all* agree before settlement.
- Duplicate-receipt hashing (same receipt image/total/vendor/timestamp across missions → flag).
- Donor-side: Turnstile + Stripe Radar; new-account velocity limits on tips (stolen-card tip laundering is a known Live-platform pattern).
