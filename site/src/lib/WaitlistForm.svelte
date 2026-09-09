<script>
  import { onMount } from 'svelte';
  import ReferralPanel from './ReferralPanel.svelte';
  import { SCENES } from './waitlist.js';
  import { validateSignup } from './waitlist.js';
  import { isReferralCode, parseReferral } from './referral.js';

  /** @type {string} */
  let email = $state('');
  /** @type {string} */
  let city = $state('');
  /** @type {Set<string>} */
  let scenes = $state(new Set());
  /** @type {string | null} */
  let error = $state(null);
  /** @type {'idle' | 'sending' | 'done'} */
  let status = $state('idle');
  /** @type {string | null} referral code captured from ?ref= (inviter's code) */
  let referredBy = $state(null);
  /** @type {string | null} this signup's own code, returned by the endpoint */
  let referralCode = $state(null);

  const STORE_KEY = 'sdm.referralCode';

  onMount(() => {
    // Capture ?ref=CODE or a pasted share link from the URL (P1 #6).
    referredBy = parseReferral(window.location.search);
    // If this browser already joined, jump straight back to the share panel.
    try {
      const saved = window.localStorage.getItem(STORE_KEY);
      if (isReferralCode(saved)) {
        referralCode = String(saved).trim().toUpperCase();
        status = 'done';
      }
    } catch {
      // Private mode / blocked storage — form still works, no panel restore.
    }
  });

  function toggle(scene) {
    const next = new Set(scenes);
    if (next.has(scene)) next.delete(scene);
    else next.add(scene);
    scenes = next;
  }

  async function submit(event) {
    event.preventDefault();
    error = null;
    const res = validateSignup({ email, city, scenes: [...scenes] });
    if (!res.ok) {
      error = res.error;
      return;
    }
    status = 'sending';
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // ownCode lets the endpoint reject self-referrals (re-signups farming
        // queue jumps); null on first join, restored from storage after.
        body: JSON.stringify({ ...res.payload, referredBy, ownCode: referralCode })
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        // Surface the endpoint's own words on 4xx (rate limit / bad code) —
        // they carry the fix ("wait a beat", "can't refer yourself").
        if (typeof data.error === 'string' && data.error.trim() !== '') {
          error = data.error;
          status = 'idle';
          return;
        }
        throw new Error('request failed');
      }
      const data = await r.json().catch(() => ({}));
      if (isReferralCode(data.referralCode)) {
        referralCode = String(data.referralCode).trim().toUpperCase();
        try {
          window.localStorage.setItem(STORE_KEY, referralCode);
        } catch {
          // Storage unavailable — panel still renders for this session.
        }
      }
      status = 'done';
    } catch {
      // Voice guide: errors sound like static, not blame.
      error = 'Static on the line — that didn\u2019t go through. Try again.';
      status = 'idle';
    }
  }
</script>

{#if status === 'done'}
  <ReferralPanel code={referralCode} city={city || null} />
{:else}
  {#if referredBy}
    <p class="mb-4 rounded-xl border border-acid-400/30 bg-acid-400/10 px-4 py-3 text-sm text-acid-400">
      A friend put you on — you’ll land ahead of the walk-ins.
    </p>
  {/if}
  <form onsubmit={submit} novalidate class="rounded-2xl border border-white/10 bg-jungle-800 p-6 sm:p-8">
    <label class="block">
      <span class="text-sm font-medium text-white/80">Email</span>
      <input
        type="email"
        bind:value={email}
        required
        placeholder="you@afterparty.fm"
        autocomplete="email"
        class="mt-1 w-full rounded-xl border border-white/10 bg-jungle-950 px-4 py-3 text-white placeholder:text-white/30 focus:border-acid-400 focus:outline-none"
      />
    </label>

    <label class="mt-4 block">
      <span class="text-sm font-medium text-white/80">Your city <span class="text-white/40">(optional — helps us pick the seed city)</span></span>
      <input
        type="text"
        bind:value={city}
        placeholder="Tulsa"
        autocomplete="address-level2"
        class="mt-1 w-full rounded-xl border border-white/10 bg-jungle-950 px-4 py-3 text-white placeholder:text-white/30 focus:border-acid-400 focus:outline-none"
      />
    </label>

    <fieldset class="mt-4">
      <legend class="text-sm font-medium text-white/80">Your scenes <span class="text-white/40">(pick a few)</span></legend>
      <div class="mt-2 flex flex-wrap gap-2">
        {#each SCENES as scene (scene)}
          <button
            type="button"
            onclick={() => toggle(scene)}
            aria-pressed={scenes.has(scene)}
            class="rounded-full border px-3 py-1.5 text-sm capitalize transition
              {scenes.has(scene)
                ? 'border-acid-400 bg-acid-400/15 text-acid-400'
                : 'border-white/15 text-white/60 hover:border-white/30'}"
          >
            {scene}
          </button>
        {/each}
      </div>
    </fieldset>

    {#if error}
      <p role="alert" class="mt-4 text-sm text-red-400">{error}</p>
    {/if}

    <button
      type="submit"
      disabled={status === 'sending'}
      class="mt-6 w-full rounded-xl bg-acid-400 px-6 py-3.5 font-display text-lg font-bold text-jungle-950 transition hover:bg-acid-500 disabled:opacity-60"
    >
      {status === 'sending' ? 'Tuning in\u2026' : 'Join the waitlist'}
    </button>
    <p class="mt-3 text-center text-xs text-white/40">18+ only. No spam — one email when your city opens.</p>
  </form>
{/if}
