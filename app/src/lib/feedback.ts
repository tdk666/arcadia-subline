/**
 * Retour multi-sensoriel d'UI — la « juice » des codes du jeu mobile (loi UX #4).
 * Haptique (navigator.vibrate) + clack synthétisé (WebAudio, zéro asset, zéro dép).
 * Tout est best-effort et silencieux en cas d'échec : un retour absent ne doit
 * JAMAIS casser une interaction. Respecte prefers-reduced-motion (pas de vibration).
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    // les navigateurs suspendent l'AudioContext tant qu'aucun geste n'a eu lieu
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Vibration courte sur un jalon (ignorée si non supportée ou mouvement réduit). */
export function haptic(pattern: number | number[] = 8): void {
  try {
    if (reducedMotion()) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}

/**
 * « Clack » de bouton physique : un clic court et chaud (deux couches —
 * un transitoire haut + un corps grave) façon tourniquet de métro.
 */
export function clack(): void {
  const ac = audio();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);

    // couche 1 : transitoire bref (le « clic »)
    const o1 = ac.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(620, now);
    o1.frequency.exponentialRampToValueAtTime(180, now + 0.05);
    // couche 2 : corps grave (le « toc » de la touche)
    const o2 = ac.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(150, now);

    o1.connect(master);
    o2.connect(master);

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.14, now + 0.006);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.1);
    o2.stop(now + 0.1);
  } catch {
    /* noop */
  }
}

/** Retour combiné d'un appui de bouton primaire (haptique + clack). */
export function tap(): void {
  haptic(8);
  clack();
}

/**
 * FANFARE DE VICTOIRE — un petit arpège majeur ascendant (Do-Mi-Sol-Do) chaud,
 * synthétisé, façon « level cleared » (Royal Match / Candy Crush). Couplé à une
 * haptique de célébration. Best-effort, jamais bloquant. Le climax sonore de la
 * conquête (loi UX #4 : son en couches sur les jalons).
 */
export function victory(): void {
  haptic([28, 50, 28, 70]);
  const ac = audio();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.0001;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.6, now + 0.4);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    master.connect(ac.destination);

    // arpège majeur ascendant + une octave brillante en couronnement
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const at = now + i * 0.1;
      const o = ac.createOscillator();
      o.type = i === 3 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.22, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
      o.connect(g).connect(master);
      o.start(at);
      o.stop(at + 0.75);
    });
  } catch {
    /* noop */
  }
}
