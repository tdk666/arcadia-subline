/**
 * Ambiance sonore du QUIZ — « Le Cabinet des Merveilles » (Louvre-Rivoli).
 * 100 % synthétisé (WebAudio), zéro asset. Une nappe douce et feutrée, façon
 * salle de musée : deux voix en quinte légèrement désaccordées + un arpège
 * cristallin très espacé (clavecin/célesta), filtrées, qui respirent. Discret —
 * ça accompagne la réflexion, ça ne la couvre pas. Débloqué au 1er geste.
 */
export class QuizAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padBus: GainNode | null = null;
  private arpTimer: ReturnType<typeof setInterval> | null = null;
  private arpStep = 0;
  muted = false;

  /** À appeler depuis un handler de geste utilisateur (politique autoplay). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32; // discret
      this.master.connect(this.ctx.destination);
      this.startPad();
      this.startArp();
    } catch {
      this.ctx = null; // pas d'audio : le jeu reste muet, jamais cassé
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.32, this.ctx.currentTime, 0.05);
    }
  }

  /** Nappe : deux voix en quinte (Do/Sol) désaccordées, filtrées, battement lent. */
  private startPad() {
    const ctx = this.ctx!;
    const bus = ctx.createGain();
    bus.gain.value = 0.0001;
    bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(lp.frequency);
    [130.81, 196.0, 196.6].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.4;
      o.connect(g).connect(lp); o.start();
    });
    lp.connect(bus).connect(this.master!);
    lfo.start();
    this.padBus = bus;
  }

  /** Arpège cristallin très espacé (célesta) — quelques notes d'une gamme majeure. */
  private startArp() {
    const ctx = this.ctx!;
    const scale = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25]; // Do-Mi-Sol-Do…
    this.arpTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      // une note sur deux pas → respiration, jamais envahissant
      if (this.arpStep % 2 === 0) {
        const f = scale[(this.arpStep / 2) % scale.length];
        const now = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        o.connect(g).connect(this.master!);
        o.start(now); o.stop(now + 1.7);
      }
      this.arpStep = (this.arpStep + 1) % 12;
    }, 900);
  }

  dispose() {
    if (this.arpTimer) { clearInterval(this.arpTimer); this.arpTimer = null; }
    if (this.padBus && this.ctx) {
      const now = this.ctx.currentTime;
      this.padBus.gain.cancelScheduledValues(now);
      this.padBus.gain.setValueAtTime(Math.max(this.padBus.gain.value, 0.0001), now);
      this.padBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    }
    const ctx = this.ctx;
    this.ctx = null; this.master = null; this.padBus = null;
    if (ctx) setTimeout(() => void ctx.close().catch(() => {}), 1000);
  }
}
