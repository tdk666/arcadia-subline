/**
 * SFX 100 % synthétisés (WebAudio) — zéro asset, zéro octet de bundle audio.
 * Chaque son est sculpté pour le feel : un canon doit cogner dans la poitrine,
 * une pierre doit craquer, une victoire doit chanter.
 * L'AudioContext est créé/débloqué sur le premier geste utilisateur (unlock()).
 */
export class DemolitionSfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /* ── Tambours révolutionnaires génératifs ─────────────────────────── */
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteAt = 0;
  private step = 0;          // pas dans la mesure (0..15, doubles-croches)
  private intensity = 0;     // 0 (bronze, calme) → 1 (assaut final, déchaîné)
  private baseFloor = 0;     // plancher d'intensité imposé par le palier

  /** À appeler depuis un handler de geste (tap "À l'assaut !"). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // bus dédié à la musique (sous le master → coupé par le mute lui aussi)
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.0;
      this.musicBus.connect(this.master);
    } catch {
      this.ctx = null; // pas d'audio dispo : le jeu reste muet, jamais cassé
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  private get ready(): boolean {
    return !!this.ctx && !!this.master && !this.muted;
  }

  /** Bruit blanc court filtré — base des impacts/débris. */
  private noise(duration: number, freq: number, gain: number, type: BiquadFilterType = 'lowpass') {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter).connect(g).connect(this.master!);
    src.start();
  }

  private tone(
    freq: number, duration: number, gain: number,
    { type = 'sine' as OscillatorType, slideTo = 0, delay = 0 } = {},
  ) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /* ── Vocabulaire du siège ─────────────────────────────────────────── */

  /** Tir de canon : détonation grave + souffle. */
  launch() {
    this.tone(140, 0.28, 0.9, { type: 'sine', slideTo: 38 });
    this.noise(0.22, 900, 0.5);
  }

  /** Impact pierre : claquement sec, intensité 0–1. */
  impact(intensity: number) {
    const k = Math.min(1, Math.max(0.2, intensity));
    this.noise(0.1 + 0.1 * k, 2200, 0.35 * k, 'bandpass');
    this.tone(90 + 60 * k, 0.12, 0.5 * k, { type: 'triangle', slideTo: 45 });
  }

  /** Bloc pulvérisé : craquement + éboulis. */
  blockDestroyed() {
    this.noise(0.3, 1400, 0.5, 'bandpass');
    this.noise(0.45, 320, 0.4);
    this.tone(70, 0.3, 0.55, { type: 'sine', slideTo: 30 });
  }

  /** Étendard abattu : sting héroïque court (quinte montante). */
  targetDown(isLast: boolean) {
    this.tone(392, 0.16, 0.4, { type: 'square' });           // sol
    this.tone(587.33, 0.22, 0.4, { type: 'square', delay: 0.09 }); // ré
    if (isLast) this.tone(784, 0.5, 0.45, { type: 'square', delay: 0.18 }); // sol aigu
  }

  /** Riser de ralenti : montée filtrée vers le coup final. */
  slowMo() {
    this.tone(180, 0.8, 0.25, { type: 'sawtooth', slideTo: 480 });
  }

  /** Victoire : LA MARSEILLAISE synthétisée + tambour de marche + feux d'artifice.
   *  Le payoff culturel du 14 juillet — un Américain de 24 ans reconnaît l'hymne. */
  victory() {
    this.marseillaise();
    // crépitement de feux d'artifice tricolores qui ponctue l'hymne
    for (let i = 0; i < 8; i++) this.noise(0.12, 3000 + Math.random() * 2000, 0.16, 'highpass');
  }

  /** Première phrase de La Marseillaise — « Allons enfants de la Patrie / le jour
   *  de gloire est arrivé » (sol majeur, rythme de marche pointé, lever ré→sol).
   *  Lead carré brillant + octave grave (triangle) pour le corps, tambour martial. */
  private marseillaise() {
    if (!this.ready) return;
    const D5 = 587.33, G5 = 783.99, A5 = 880.0, B5 = 987.77, C6 = 1046.5, D6 = 1174.66;
    const beat = 0.36; // ≈ 83 BPM, allant martial
    // [fréquence (0 = silence), durée en temps]
    const seq: [number, number][] = [
      [D5, 0.5], [D5, 0.5],                  // Al- lons
      [G5, 0.75], [G5, 0.25], [G5, 0.5],     // en- fants  de
      [B5, 0.5], [A5, 1.0],                  // la  pa-trie
      [0, 0.25],
      [D5, 0.5], [D5, 0.5],                  // le  jour
      [D5, 0.75], [B5, 0.25],                // de  gloire
      [G5, 0.5], [A5, 0.5], [G5, 1.0],       // est a- rri- vé
      [0, 0.25],
      [A5, 0.5], [B5, 0.5], [C6, 0.5], [D6, 1.25], // élan final triomphal
    ];
    let t = 0;
    for (const [f, d] of seq) {
      if (f > 0) {
        this.tone(f, d * beat * 0.96, 0.30, { type: 'square', delay: t * beat });
        this.tone(f / 2, d * beat * 0.96, 0.18, { type: 'triangle', delay: t * beat });
      }
      t += d;
    }
    // tambour de marche sous l'hymne (grosse caisse synthétique sur les temps)
    for (let b = 0; b < Math.ceil(t); b++) {
      this.tone(120, 0.16, 0.5, { type: 'sine', slideTo: 44, delay: b * beat });
    }
  }

  /** Défaite : descente sourde, digne (on rejouera). */
  defeat() {
    this.tone(220, 0.5, 0.3, { type: 'triangle', slideTo: 110 });
    this.tone(110, 0.8, 0.25, { type: 'sine', slideTo: 55, delay: 0.25 });
  }

  /** Tic d'urgence du chrono (palier Or, dernières secondes). */
  tick() {
    this.tone(1320, 0.05, 0.15, { type: 'square' });
  }

  /* ══ TAMBOURS RÉVOLUTIONNAIRES GÉNÉRATIFS ════════════════════════════
     Une rythmique de marche qui s'emballe avec la destruction : plancher
     posé par le palier, tempo + densité pilotés par l'intensité. Scheduler
     à fenêtre glissante (lookahead) caché derrière l'horloge WebAudio. */

  /** Démarre la boucle. `floor` = intensité minimale du palier (0/0.25/0.5). */
  startMusic(floor = 0) {
    if (!this.ctx || !this.musicBus || this.musicTimer) return;
    this.baseFloor = floor;
    this.intensity = floor;
    this.step = 0;
    this.nextNoteAt = this.ctx.currentTime + 0.08;
    this.musicBus.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.4); // fade-in
    this.musicTimer = setInterval(() => this.scheduler(), 25);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
  }

  /** Libère l'AudioContext (au démontage de l'écran) — évite d'en accumuler. */
  dispose() {
    this.stopMusic();
    try { void this.ctx?.close(); } catch { /* déjà fermé */ }
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
  }

  /** Pilote l'emballement (0→1). Ne descend jamais sous le plancher du palier. */
  setMusicIntensity(v: number) {
    this.intensity = Math.max(this.baseFloor, Math.min(1, v));
  }

  /** Fenêtre glissante : programme les pas tant qu'ils tombent < +100 ms. */
  private scheduler() {
    if (!this.ctx) return;
    const stepsPerBeat = 4;                       // doubles-croches
    while (this.nextNoteAt < this.ctx.currentTime + 0.1) {
      // tempo : 82 BPM au repos → 156 BPM déchaîné
      const bpm = 82 + this.intensity * 74;
      const stepDur = 60 / bpm / stepsPerBeat;
      this.scheduleStep(this.step, this.nextNoteAt);
      this.nextNoteAt += stepDur;
      this.step = (this.step + 1) % 16;
    }
  }

  /** Voix de tambour pour un pas donné, selon l'intensité (couches qui s'ajoutent). */
  private scheduleStep(step: number, at: number) {
    const I = this.intensity;
    const beat = step % 4 === 0;
    const half = step % 8 === 0;

    // grosse caisse : sur chaque temps ; doublée quand ça chauffe
    if (beat) this.kick(at, 0.9);
    if (I > 0.55 && step % 4 === 2) this.kick(at, 0.6);

    // caisse claire (roulement) sur les contretemps, densité ∝ intensité
    if (half) this.snare(at, 0.5 + I * 0.3);
    if (I > 0.35 && step % 4 === 2) this.snare(at, 0.3);
    if (I > 0.7 && step % 2 === 1) this.snare(at, 0.18 + Math.random() * 0.1); // roulement

    // toms d'ornement à haute intensité (la charge finale)
    if (I > 0.8 && (step === 14 || step === 15)) {
      this.tom(at, 220 - (step - 14) * 40, 0.4);
    }

    // FIFRE révolutionnaire (idiome contredanse « Ça ira ») : entre quand l'assaut
    // chauffe, se densifie et monte avec l'intensité. Motif sautillant en sol majeur.
    if (I > 0.34) {
      const onBeat = step % 4 === 0;     // noires : G5 B5 D6 B5
      const offBeat = step % 4 === 2;    // croches : A5 C6 B5 A5 (ajoutées à haute intensité)
      const G5 = 783.99, A5 = 880.0, B5 = 987.77, C6 = 1046.5, D6 = 1174.66;
      const beatMotif = [G5, B5, D6, B5];
      const offMotif = [A5, C6, B5, A5];
      if (onBeat) this.fife(at, beatMotif[(step / 4) % 4], 0.16 + I * 0.14);
      if (offBeat && I > 0.62) this.fife(at, offMotif[((step - 2) / 4) % 4], 0.12 + I * 0.1);
    }
  }

  /** Fifre : note brève et claire (square + octave triangle) sur le bus musique. */
  private fife(at: number, freq: number, gain: number) {
    if (!this.ctx || !this.musicBus) return;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(freq, at);
    o2.type = 'triangle'; o2.frequency.setValueAtTime(freq / 2, at);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
    o.connect(g); o2.connect(g); g.connect(this.musicBus);
    o.start(at); o2.start(at); o.stop(at + 0.18); o2.stop(at + 0.18);
  }

  private kick(at: number, gain: number) {
    if (!this.ctx || !this.musicBus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(46, at + 0.12);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain * 0.6, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    o.connect(g).connect(this.musicBus);
    o.start(at); o.stop(at + 0.2);
  }

  private snare(at: number, gain: number) {
    if (!this.ctx || !this.musicBus) return;
    const len = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.5, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(at); src.stop(at + 0.13);
  }

  private tom(at: number, freq: number, gain: number) {
    if (!this.ctx || !this.musicBus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.16);
    g.gain.setValueAtTime(gain * 0.5, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    o.connect(g).connect(this.musicBus);
    o.start(at); o.stop(at + 0.2);
  }
}
