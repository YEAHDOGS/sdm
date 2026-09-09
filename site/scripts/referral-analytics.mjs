#!/usr/bin/env node
/**
 * referral-analytics.mjs — CLI summary of the sdm referral loop.
 *
 * Reads a JSON file containing an events array (or { events: [...] }) and
 * prints founder numbers: k-factor per window, conversion funnel, and the
 * top-referrer leaderboard with anti-gaming flags.
 *
 * Usage: node site/scripts/referral-analytics.mjs <events.json> [--window daily|weekly] [--limit N]
 *
 * Pure node, no install needed. Event shapes: see site/src/lib/analytics.js.
 */
import { readFileSync } from 'node:fs';
import { analyticsSummary } from '../src/lib/analytics.js';

function usage(exitCode = 0) {
  console.log(`usage: node referral-analytics.mjs <events.json> [--window daily|weekly] [--limit N]`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = { window: 'daily', limit: 10 };
  let file = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--window') {
      opts.window = argv[++i];
      if (opts.window !== 'daily' && opts.window !== 'weekly') {
        console.error(`error: --window must be 'daily' or 'weekly'.`);
        process.exit(1);
      }
    } else if (a === '--limit') {
      opts.limit = Math.max(1, Math.floor(Number(argv[++i]) || 10));
    } else if (a === '-h' || a === '--help') {
      usage(0);
    } else if (!file && !a.startsWith('--')) {
      file = a;
    } else {
      console.error(`error: unknown argument '${a}'.`);
      usage(1);
    }
  }
  if (!file) usage(1);
  return { file, opts };
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

const { file, opts } = parseArgs(process.argv.slice(2));

let parsed;
try {
  parsed = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`error: could not read/parse '${file}': ${e.message}`);
  process.exit(1);
}
const events = Array.isArray(parsed) ? parsed : parsed.events;
if (!Array.isArray(events)) {
  console.error(`error: '${file}' must contain an events array (or { events: [...] }).`);
  process.exit(1);
}

const s = analyticsSummary(events, opts);

console.log('=== sdm referral analytics ===');
console.log(`events: ${s.events} valid, ${s.eventsRejected} rejected\n`);

console.log(`--- k-factor (${opts.window}) ---`);
for (const w of s.windows) {
  const day = w.windowStart.slice(0, 10);
  console.log(
    `${day}  k=${w.kFactor.toFixed(2)}  signups=${w.signups}  invites=${w.invitesSent}  converted=${w.invitesConverted}`
  );
}
if (s.windows.length === 0) console.log('(no windows)');

const f = s.funnel;
console.log('\n--- conversion funnel ---');
console.log(`invite_sent:            ${f.invitesSent}`);
console.log(`joined:                 ${f.joined} (${f.joinedViaReferral} via referral)`);
console.log(`activated:              ${f.activated}`);
console.log(`invite -> join:         ${pct(f.inviteToJoin)}`);
console.log(`join -> activated:      ${pct(f.joinToActivated)}`);
console.log(`end-to-end:             ${pct(f.endToEnd)}`);

console.log(`\n--- top referrers (trusted) ---`);
if (s.leaderboard.length === 0) {
  console.log('(none yet)');
} else {
  s.leaderboard.forEach((r, i) => {
    const flags = r.flags.length > 0 ? `  [${r.flags.join(', ')}]` : '';
    console.log(`${i + 1}. ${r.code}  trusted=${r.trusted}  raw=${r.credited}${flags}`);
  });
}
