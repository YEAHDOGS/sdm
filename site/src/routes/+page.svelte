<script>
  import WaitlistForm from '$lib/WaitlistForm.svelte';
  import '../app.css';
</script>

<svelte:head>
  <title>sdm — Dating for the animals in the jungle</title>
</svelte:head>

<header class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
  <span class="font-display text-2xl font-black tracking-tight text-white">
    sdm<span class="text-acid-400">.</span>
  </span>
  <a
    href="#waitlist"
    class="rounded-full bg-acid-400 px-5 py-2 font-display text-sm font-bold text-jungle-950 transition hover:bg-acid-500"
  >
    Join the waitlist
  </a>
</header>

<main>
  <!-- HERO -->
  <section class="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-16">
    <p class="font-display text-sm font-bold uppercase tracking-[0.3em] text-acid-400">
      Sex, Drugs, Music
    </p>
    <h1 class="font-display mt-4 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-7xl">
      Dating for the animals in the jungle.
    </h1>
    <p class="mt-6 max-w-xl text-lg text-white/70">
      sdm matches you on the soundtrack you live to — your gigs, your scenes,
      your 3am replay loop. Photos can wait. <span class="text-white/50">Your vibe
      score is a shared playlist, not a shared zip code.</span>
    </p>
    <div class="mt-8 flex flex-wrap gap-4">
      <a
        href="#waitlist"
        class="rounded-xl bg-acid-400 px-8 py-3.5 font-display text-lg font-bold text-jungle-950 transition hover:bg-acid-500"
      >
        Get on the list
      </a>
      <a
        href="#how"
        class="rounded-xl border border-white/15 px-8 py-3.5 font-display text-lg font-bold text-white/80 transition hover:border-white/30"
      >
        How it works
      </a>
    </div>
    <p class="mt-4 text-sm text-white/40">18+ only. Launching one city at a time.</p>
  </section>

  <!-- PILLARS -->
  <section class="border-t border-white/10 bg-jungle-900">
    <div class="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3">
      <div class="rounded-2xl border border-white/10 bg-jungle-800 p-6">
        <h2 class="font-display text-xl font-bold text-acid-400">Sonic fingerprint &gt; photo grid</h2>
        <p class="mt-2 text-white/60">
          Listening overlap, gig overlap, scene overlap. Your match card shows a
          vibe score and the playlist that proves it.
        </p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-jungle-800 p-6">
        <h2 class="font-display text-xl font-bold text-acid-400">Scene-based discovery</h2>
        <p class="mt-2 text-white/60">
          "Who's going to the show Friday?" Meet at the watering hole, not in
          the DM void.
        </p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-jungle-800 p-6">
        <h2 class="font-display text-xl font-bold text-acid-400">Music first, photos later</h2>
        <p class="mt-2 text-white/60">
          Onboarding asks what you listen to before it asks what you look
          like. We're not that kind of app.
        </p>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section id="how" class="mx-auto max-w-6xl px-6 py-16">
    <h2 class="font-display text-3xl font-black text-white sm:text-4xl">Tune your frequency.</h2>
    <ol class="mt-8 grid gap-6 sm:grid-cols-3">
      <li class="rounded-2xl border border-white/10 bg-jungle-800 p-6">
        <p class="font-display text-sm font-bold uppercase tracking-widest text-acid-400">Step 1</p>
        <p class="mt-2 font-display text-lg font-bold text-white">Answer the music questions</p>
        <p class="mt-1 text-white/60">Pick the three artists you'd defend in a bar fight. Fresh ears start provisional.</p>
      </li>
      <li class="rounded-2xl border border-white/10 bg-jungle-800 p-6">
        <p class="font-display text-sm font-bold uppercase tracking-widest text-acid-400">Step 2</p>
        <p class="mt-2 font-display text-lg font-bold text-white">Get your fingerprint</p>
        <p class="mt-1 text-white/60">Every match shows why: top shared artists, scene rarity, same-room gig boosts.</p>
      </li>
      <li class="rounded-2xl border border-white/10 bg-jungle-800 p-6">
        <p class="font-display text-sm font-bold uppercase tracking-widest text-acid-400">Step 3</p>
        <p class="mt-2 font-display text-lg font-bold text-white">Find your pack</p>
        <p class="mt-1 text-white/60">Press play on the overlap playlist before you type. Then say hi at the show.</p>
      </li>
    </ol>
  </section>

  <!-- SAFETY -->
  <section class="border-t border-white/10 bg-jungle-900">
    <div class="mx-auto max-w-6xl px-6 py-12">
      <p class="font-display text-lg font-bold text-white">Rock-and-roll name. Serious product.</p>
      <p class="mt-2 max-w-2xl text-white/60">
        18+ hard gate. Photo verification before you hit the deck. Listening
        data is for matching only — never sold. Delete your account and
        everything goes with it.
      </p>
    </div>
  </section>

  <!-- WAITLIST -->
  <section id="waitlist" class="mx-auto max-w-2xl px-6 py-16">
    <h2 class="font-display text-3xl font-black text-white sm:text-4xl">The jungle is opening soon.</h2>
    <p class="mt-3 text-white/60">
      We're seeding one city first. Tell us where you hunt and we'll call you
      when the watering hole opens.
    </p>
    <div class="mt-8">
      <WaitlistForm />
    </div>
  </section>
</main>

<footer class="border-t border-white/10">
  <div class="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
    <p><span class="font-display font-bold text-white/60">sdm.</span> Sex, Drugs, Music — a YEAHDOGS concept. Name pending trademark screen.</p>
    <p>18+ only.</p>
  </div>
</footer>
