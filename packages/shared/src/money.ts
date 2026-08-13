/**
 * All money is integer cents. No floats, ever.
 */

export interface Split {
  goodsCents: number;
  helperCents: number;
  platformCents: number;
}

/** The default "$10 pizza run" price card. */
export const DEFAULT_SPLIT: Split = {
  goodsCents: 500,
  helperCents: 400,
  platformCents: 100,
};

export function splitTotalCents(s: Split): number {
  return s.goodsCents + s.helperCents + s.platformCents;
}

export function assertValidSplit(s: Split, expectedTotalCents: number): void {
  for (const [k, v] of Object.entries(s)) {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`invalid split component ${k}=${v}`);
    }
  }
  const total = splitTotalCents(s);
  if (total !== expectedTotalCents) {
    throw new Error(`split totals ${total}c but donation is ${expectedTotalCents}c`);
  }
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Ledger account names — see docs/payments.md. */
export const ACCOUNTS = [
  "donor_cash",
  "donation_escrow",
  "vendor_payable",
  "helper_payable",
  "platform_revenue",
] as const;

export type Account = (typeof ACCOUNTS)[number];
