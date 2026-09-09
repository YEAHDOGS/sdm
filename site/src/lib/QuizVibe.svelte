<script>
  import { QUESTIONS, AXES } from './quiz.js';
  import { buildQuizProfile, topMatches } from './quizVibe.js';

  const TOTAL = QUESTIONS.length;

  /** @type {Record<string, string>} */
  let answers = $state({});

  /** @type {boolean} */
  let copied = $state(false);

  const answered = $derived(Object.keys(answers).length);
  const quizRun = $derived(buildQuizProfile(answers));
  const complete = $derived(quizRun.ok);

  const matches = $derived(
    complete ? topMatches(quizRun.result.profile, 3).result : []
  );

  const axisBars = $derived(
    complete
      ? AXES.map((axis) => ({ axis, value: quizRun.result.quiz.scores[axis] }))
      : []
  );

  function pick(questionId, optionId) {
    answers = { ...answers, [questionId]: optionId };
    copied = false;
  }

  function retake() {
    answers = {};
    copied = false;
  }

  async function copyShare() {
    if (!complete) return;
    try {
      await navigator.clipboard.writeText(quizRun.result.quiz.shareText);
      copied = true;
    } catch {
      copied = false;
    }
  }
</script>

<div class="rounded-2xl border border-white/10 bg-jungle-800 p-6 sm:p-8">
  <!-- Progress -->
  <div class="flex items-center justify-between">
    <p class="font-display text-sm font-bold uppercase tracking-widest text-acid-400">
      Sonic fingerprint
    </p>
    <p class="text-sm text-white/50">{answered} / {TOTAL}</p>
  </div>
  <div class="mt-2 h-2 overflow-hidden rounded-full bg-jungle-950" role="progressbar" aria-valuenow={answered} aria-valuemin="0" aria-valuemax={TOTAL}>
    <div
      class="h-full rounded-full bg-acid-400 transition-all"
      style="width: {(100 * answered) / TOTAL}%"
    ></div>
  </div>

  <!-- Questions -->
  <ol class="mt-8 space-y-8">
    {#each QUESTIONS as q, i (q.id)}
      <li>
        <p class="font-display text-lg font-bold text-white">
          <span class="mr-2 text-acid-400">{i + 1}.</span>{q.prompt}
        </p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          {#each q.options as opt (opt.id)}
            <button
              type="button"
              onclick={() => pick(q.id, opt.id)}
              aria-pressed={answers[q.id] === opt.id}
              class="rounded-xl border px-4 py-3 text-left text-sm transition
                {answers[q.id] === opt.id
                  ? 'border-acid-400 bg-acid-400/15 text-white'
                  : 'border-white/10 text-white/70 hover:border-white/30 hover:text-white'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </li>
    {/each}
  </ol>

  <!-- Results -->
  {#if complete}
    <div class="mt-10 rounded-2xl border border-acid-400/40 bg-jungle-950 p-6 sm:p-8">
      <p class="font-display text-sm font-bold uppercase tracking-widest text-acid-400">
        Your frequency
      </p>
      <h3 class="mt-1 font-display text-3xl font-black text-white">
        {quizRun.result.quiz.archetype.name}
      </h3>
      <p class="mt-1 text-acid-400">{quizRun.result.quiz.archetype.tagline}</p>
      <p class="mt-3 max-w-2xl text-white/70">{quizRun.result.quiz.archetype.blurb}</p>

      <!-- Axis bars -->
      <div class="mt-6 space-y-2">
        {#each axisBars as bar (bar.axis)}
          <div class="flex items-center gap-3">
            <span class="w-24 shrink-0 font-display text-xs font-bold uppercase tracking-widest text-white/60">
              {bar.axis}
            </span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-jungle-800">
              <div class="h-full rounded-full bg-acid-400" style="width: {bar.value}%"></div>
            </div>
            <span class="w-10 shrink-0 text-right text-sm text-white/60">{bar.value}</span>
          </div>
        {/each}
      </div>

      <!-- Live matches -->
      <p class="mt-8 font-display text-sm font-bold uppercase tracking-widest text-acid-400">
        Your pack would be
      </p>
      <div class="mt-3 grid gap-4 sm:grid-cols-3">
        {#each matches as entry, i (entry.profile.displayName)}
          <div class="rounded-xl border border-white/10 bg-jungle-800 p-4">
            <div class="flex items-baseline justify-between">
              <p class="font-display text-lg font-bold text-white">
                {i + 1}. {entry.profile.displayName}
              </p>
              <p class="font-display text-2xl font-black text-acid-400">{entry.match.score}</p>
            </div>
            <p class="text-xs text-white/50">{entry.profile.archetypeName}</p>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-jungle-950">
              <div class="h-full rounded-full bg-acid-400" style="width: {entry.match.score}%"></div>
            </div>
            <ul class="mt-3 space-y-1.5">
              {#each entry.match.reasons.slice(0, 3) as reason (reason)}
                <li class="text-sm leading-snug text-white/70">{reason}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
      <p class="mt-4 text-xs text-white/40">
        Live: change any answer and your pack reshuffles — your sonic
        fingerprint is the tiebreaker in the vibe engine.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onclick={copyShare}
          class="rounded-xl bg-acid-400 px-6 py-3 font-display text-base font-bold text-jungle-950 transition hover:bg-acid-500"
        >
          {copied ? 'Copied — spread the signal' : 'Copy my result'}
        </button>
        <button
          type="button"
          onclick={retake}
          class="rounded-xl border border-white/20 px-6 py-3 font-display text-base font-bold text-white/80 transition hover:border-white/40"
        >
          Retake
        </button>
      </div>
    </div>
  {:else}
    <p class="mt-8 text-center text-sm text-white/50">
      Answer all {TOTAL} questions to get your fingerprint — {TOTAL - answered} to go.
    </p>
  {/if}
</div>
