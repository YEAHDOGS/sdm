import type { Account } from "@help/shared";

export interface LedgerLine {
  account: Account;
  direction: "debit" | "credit";
  amountCents: number;
}

/**
 * Append balanced ledger lines for a mission in one D1 batch.
 * `eventKey` makes the posting idempotent — replaying a webhook or a queue
 * job no-ops on the UNIQUE(idempotency_key) constraint.
 */
export async function postEntries(
  db: D1Database,
  missionId: string,
  eventKey: string,
  lines: LedgerLine[]
): Promise<void> {
  const debits = lines.filter((l) => l.direction === "debit").reduce((s, l) => s + l.amountCents, 0);
  const credits = lines.filter((l) => l.direction === "credit").reduce((s, l) => s + l.amountCents, 0);
  if (debits !== credits) {
    throw new Error(`unbalanced ledger posting for ${missionId}: ${debits} != ${credits}`);
  }

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO ledger_entries (mission_id, account, direction, amount_cents, idempotency_key)
     VALUES (?, ?, ?, ?, ?)`
  );
  await db.batch(
    lines.map((l, i) =>
      stmt.bind(missionId, l.account, l.direction, l.amountCents, `${eventKey}:${i}`)
    )
  );
}

/** Donation confirmed: donor cash moves into escrow. */
export function fundingLines(totalCents: number): LedgerLine[] {
  return [
    { account: "donor_cash", direction: "debit", amountCents: totalCents },
    { account: "donation_escrow", direction: "credit", amountCents: totalCents },
  ];
}

/** Mission completed: escrow fans out to the three payable accounts. */
export function settlementLines(goods: number, helper: number, platform: number): LedgerLine[] {
  return [
    { account: "donation_escrow", direction: "debit", amountCents: goods },
    { account: "vendor_payable", direction: "credit", amountCents: goods },
    { account: "donation_escrow", direction: "debit", amountCents: helper },
    { account: "helper_payable", direction: "credit", amountCents: helper },
    { account: "donation_escrow", direction: "debit", amountCents: platform },
    { account: "platform_revenue", direction: "credit", amountCents: platform },
  ];
}
