<script>
  import { SCENES } from './waitlist.js';
  import { validateSignup } from './waitlist.js';

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
        body: JSON.stringify(res.payload)
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || 'request failed');
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
  <div class="rounded-2xl border border-acid-400/40 bg-jungle-800 p-8 text-center">
    <p class="font-display text-2xl font-bold text-acid-400">You\u2019re in the jungle.</p>
    <p class="mt-2 text-white/70">Watch your inbox. First watering holes get announced soon.</p>
  </div>
{:else}
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
