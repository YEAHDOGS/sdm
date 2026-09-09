<script>
  import { onMount } from 'svelte';
  import {
    isReferralCode,
    shareLink,
    shareText,
    JUMP_PER_REFERRAL,
    MAX_JUMP
  } from './referral.js';

  /** @type {{ code: string, city?: string | null }} */
  let { code, city = null } = $props();

  /** @type {string | null} */
  let link = $state(null);
  /** @type {string | null} */
  let text = $state(null);
  /** @type {'code' | 'link' | 'text' | 'manual' | null} */
  let copied = $state(null);
  /** @type {string | null} */
  let loadError = $state(null);

  const valid = isReferralCode(code);

  onMount(() => {
    if (!valid) {
      loadError = 'Static on the line — your invite code didn\u2019t come through. Your spot is still saved.';
      return;
    }
    try {
      link = shareLink(code, window.location.origin);
      text = shareText(code, { city: city ?? undefined });
    } catch {
      loadError = 'Static on the line — your invite code didn\u2019t come through. Your spot is still saved.';
    }
  });

  /** Copy helper with a manual fallback for browsers without clipboard API. */
  async function copy(value, which) {
    if (!value) return;
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(value);
      copied = which;
      setTimeout(() => {
        copied = null;
      }, 2000);
    } catch {
      // Fallback: the link/code sit in selectable readonly fields below —
      // user copies manually.
      copied = 'manual';
    }
  }
</script>

<div class="rounded-2xl border border-acid-400/40 bg-jungle-800 p-6 sm:p-8 text-center">
  <p class="font-display text-2xl font-bold text-acid-400">You’re in the jungle.</p>

  {#if loadError}
    <p class="mt-3 text-sm text-white/70">{loadError}</p>
  {:else}
    <p class="mt-3 text-white/70">
      Every friend who joins with your link moves you up
      <span class="font-bold text-white">{JUMP_PER_REFERRAL} spots</span>
      (max {MAX_JUMP}). Bring your crew.
    </p>

    <div class="mt-5 rounded-xl border border-white/10 bg-jungle-950 p-4">
      <p class="text-xs uppercase tracking-widest text-white/40">Your invite code</p>
      <p class="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-acid-400">{code}</p>
      <button
        type="button"
        onclick={() => copy(code, 'code')}
        class="mt-2 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition hover:border-acid-400 hover:text-acid-400"
      >
        {copied === 'code' ? 'Copied ✓' : 'Copy code'}
      </button>
    </div>

    {#if link}
      <div class="mt-4 text-left">
        <label class="text-xs uppercase tracking-widest text-white/40" for="referral-link">
          Your invite link
        </label>
        <div class="mt-1 flex gap-2">
          <input
            id="referral-link"
            type="text"
            readonly
            value={link}
            onfocus={(e) => e.currentTarget.select()}
            class="min-w-0 flex-1 rounded-xl border border-white/10 bg-jungle-950 px-4 py-2.5 font-mono text-sm text-white/80 focus:border-acid-400 focus:outline-none"
          />
          <button
            type="button"
            onclick={() => copy(link, 'link')}
            class="shrink-0 rounded-xl bg-acid-400 px-4 py-2.5 font-display text-sm font-bold text-jungle-950 transition hover:bg-acid-500"
          >
            {copied === 'link' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>
    {/if}

    {#if text}
      <div class="mt-4 rounded-xl border border-white/10 bg-jungle-950/60 p-4 text-left">
        <p class="text-xs uppercase tracking-widest text-white/40">Suggested message</p>
        <p class="mt-1 text-sm text-white/70">{text}</p>
        <button
          type="button"
          onclick={() => copy(text, 'text')}
          class="mt-2 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition hover:border-acid-400 hover:text-acid-400"
        >
          {copied === 'text' ? 'Copied ✓' : 'Copy message'}
        </button>
      </div>
    {/if}

    {#if copied === 'manual'}
      <p class="mt-3 text-xs text-white/50">
        Clipboard is blocked in this browser — tap the link or code above to select it, then copy manually.
      </p>
    {/if}

    <p class="mt-4 text-xs text-white/40">
      We’ll email you when your city opens. Your invites are already counting.
    </p>
  {/if}
</div>
