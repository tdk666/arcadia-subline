/**
 * Sound design de la cinématique « L'Émergence » — synthèse WebAudio (zéro asset).
 * Couches sobres et premium (émerveillement, pas gadget). L'AudioContext ne naît
 * qu'au 1er geste utilisateur (politique autoplay) ; tout est no-op sinon, et
 * coupable via mute. Respecte prefers-reduced-motion côté appelant si besoin.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let pad: { stop: () => void } | null = null;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export const ftueSfx = {
  /** À appeler sur le 1er geste (pointerdown) pour débloquer l'audio. */
  unlock() { ensure(); },
  setMuted(m: boolean) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; },
  isMuted() { return muted; },

  /** Grondement sourd qui enfle (le tunnel, la rame qui approche). */
  rumble(dur = 3) {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = 46;
    const lfo = c.createOscillator(); lfo.frequency.value = 7;
    const lfoGain = c.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain).connect(osc.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t); lfo.start(t); osc.stop(t + dur); lfo.stop(t + dur);
  },

  /** Souffle lumineux : l'émergence du tunnel (bruit filtré qui monte). */
  whoosh() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime;
    const buffer = c.createBuffer(1, c.sampleRate * 1.4, c.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buffer;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(220, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 1.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    src.connect(bp).connect(g).connect(master);
    src.start(t); src.stop(t + 1.4);
  },

  /** Carillon clair (la révélation culturelle / l'archive qui s'ouvre). */
  chime() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime;
    [880, 1320, 1760].forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = c.createGain();
      const at = t + i * 0.06;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
      o.connect(g).connect(master!); o.start(at); o.stop(at + 1.1);
    });
  },

  /** Étincelle de victoire (la conquête tricolore). */
  sparkle() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = c.createGain();
      const at = t + i * 0.07;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      o.connect(g).connect(master!); o.start(at); o.stop(at + 0.5);
    });
  },

  /**
   * Nappe ambiante continue (le « monde » de Paris qui respire sous la scène).
   * Drone très doux : deux quintes (Do/Sol) légèrement désaccordées + battement
   * lent au filtre. Démarre fondu, se laisse oublier. Idempotent.
   */
  ambientStart() {
    const c = ensure(); if (!c || !master) return;
    if (pad) return;
    const t = c.currentTime;
    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.exponentialRampToValueAtTime(0.06, t + 4); // fondu d'entrée lent
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    // battement lent du filtre (respiration)
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = c.createGain(); lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency);
    const oscs: OscillatorNode[] = [];
    [{ f: 65.41, type: 'sine' as const }, { f: 98.0, type: 'sine' as const },
     { f: 196.0, type: 'triangle' as const }, { f: 196.9, type: 'triangle' as const }]
      .forEach(({ f, type }) => {
        const o = c.createOscillator(); o.type = type; o.frequency.value = f;
        const og = c.createGain(); og.gain.value = type === 'sine' ? 0.5 : 0.18;
        o.connect(og).connect(lp); o.start(t); oscs.push(o);
      });
    lp.connect(bus).connect(master);
    lfo.start(t);
    pad = {
      stop: () => {
        const c2 = ctx; if (!c2) return;
        const now = c2.currentTime;
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), now);
        bus.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // fondu de sortie
        oscs.forEach((o) => o.stop(now + 1.3));
        lfo.stop(now + 1.3);
      },
    };
  },

  /** Coupe la nappe ambiante (fondu de sortie). Idempotent. */
  ambientStop() {
    if (pad) { pad.stop(); pad = null; }
  },
};
