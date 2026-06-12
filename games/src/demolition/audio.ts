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

  /** Fanfare de victoire : arpège triomphal + feux d'artifice. */
  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // do mi sol do
    notes.forEach((f, i) => {
      this.tone(f, 0.5, 0.34, { type: 'square', delay: i * 0.13 });
      this.tone(f / 2, 0.5, 0.22, { type: 'triangle', delay: i * 0.13 });
    });
    this.tone(1046.5, 1.1, 0.3, { type: 'square', delay: 0.55 });
    // crépitement de feux d'artifice
    for (let i = 0; i < 6; i++) this.noise(0.12, 3000 + Math.random() * 2000, 0.18, 'highpass');
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
}
