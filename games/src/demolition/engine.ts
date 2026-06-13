import Matter from 'matter-js';
import type { DifficultyTier } from '../contract';
import type { BlockMaterial, DemolitionLevel, DemolitionParams } from './types';
import type { DemolitionSfx } from './audio';

const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;

/* ── Réglages matière — « Paris Souterrain » : pierre de taille, bois, zinc ──
   Chaque matière porte son volume : base + face éclairée + occlusion + rim
   ambre (lumière chaude des torches/réverbères qui lèche les arêtes). */
const MATERIAL = {
  // pierre de taille chaude (les murs de la Bastille)
  stone: { hp: 26, density: 0.0024, base: '#5a4a34', light: '#8a7350', dark: '#2c2318', rim: '#e0964a' },
  // bois — brun chaud (linteaux, charpentes)
  wood: { hp: 14, density: 0.0012, base: '#6b4a26', light: '#9a6e36', dark: '#36240f', rim: '#e0b070' },
  // fer / zinc — gris froid mesuré, reflet laiton (renforts)
  iron: { hp: Infinity, density: 0.005, base: '#4a525a', light: '#8a96a0', dark: '#262c33', rim: '#c9a227' },
} as const satisfies Record<BlockMaterial, unknown>;

const BALL_R = 15;
const MAX_DRAG = 95;
const LAUNCH_POWER = 0.205;
const SETTLE_SPEED = 0.18;
const SETTLE_MS = 900;
const SHOT_TIMEOUT_MS = 6500;
const END_GRACE_MS = 1600;

/** Ambiances par palier : nuit qui vire à l'ambre, le siège se durcit.
 *  Cible visuelle : haut nuit → horizon ambre incandescent → sol brun chaud. */
const TIER_SKY: Record<DifficultyTier, { top: string; mid: string; horizon: string; glow: string; ground: string; moon: string }> = {
  // crépuscule de révolte : la nuit tombe sur le faubourg
  bronze: { top: '#0a0912', mid: '#241a30', horizon: '#a85c2c', glow: '#e0964a', ground: '#241910', moon: '#e9d39c' },
  // nuit profonde, braises à l'horizon
  silver: { top: '#080711', mid: '#1c1830', horizon: '#9c4f28', glow: '#d9803c', ground: '#201610', moon: '#e9d39c' },
  // l'assaut final : l'incendie embrase le ciel
  gold:   { top: '#0a0710', mid: '#2a1626', horizon: '#c25a26', glow: '#ff8a3c', ground: '#2a1710', moon: '#f0c98a' },
};

export interface HudState {
  shotsLeft: number;
  destructionPct: number;
  targetsDown: number;
  totalTargets: number;
  timeLeftS: number | null;
  phase: 'aim' | 'flight' | 'ended';
  /** Le joueur a déjà saisi le boulet au moins une fois (pilote le hint geste). */
  interacted: boolean;
}

export interface Outcome {
  win: boolean;
  shotsUsed: number;
  destructionPct: number;
  targetsDown: number;
  totalTargets: number;
  timeLeftMs: number;
  totalBlocks: number;
  blocksDestroyed: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  /** chunk = débris rotatif (rectangle), spark = étincelle (carré). */
  kind: 'spark' | 'chunk' | 'dust';
  rot: number; vr: number; w: number; h: number;
}

interface Ring { x: number; y: number; r: number; maxR: number; life: number; maxLife: number; color: string }

interface BlockMeta { hp: number; maxHp: number; material: BlockMaterial }

export class DemolitionEngine {
  private engine = Engine.create({ enableSleeping: false });
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: DemolitionLevel;
  private params: DemolitionParams;
  private tier: DifficultyTier;
  private reducedMotion: boolean;
  private onHud: (s: HudState) => void;
  private onEnd: (o: Outcome) => void;
  private sfx: DemolitionSfx | null;
  private haptic: (pattern: number | number[]) => void;

  private blocks = new Map<number, BlockMeta>();
  private targets = new Set<number>();
  private torches: { x: number; y: number }[] = [];
  private totalTargets = 0;
  private destructible = 0;
  private destroyed = 0;
  private targetsDown = 0;

  private ball: Matter.Body | null = null;
  private ballInFlight = false;
  private shotsUsed = 0;
  /** false tant que le 1er boulet n'est pas parti : AUCUN dégât, AUCUNE victoire
   *  possible — corrige la "victoire fantôme" causée par le tassement initial. */
  private armed = false;
  private interacted = false;
  private dragging = false;
  private dragPos: { x: number; y: number } | null = null;
  private dragFrac = 0;            // tension de la fronde (0→1), pilote le feel de charge
  private chargedHaptic = false;   // un seul buzz quand la charge atteint le max
  private settleSince = 0;
  private flightSince = 0;
  private trail: { x: number; y: number }[] = [];

  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private shake = 0;
  private zoomPulse = 0;
  private hitstop = 0;             // gel d'image (ms) sur impact lourd — « ça cogne »
  private timescale = 1;
  private timescaleTarget = 1;
  private slowMoUntil = 0;
  private fireworkWaves = 0;
  private nextFireworkAt = 0;
  private lastTickSecond = -1;

  private startedAt = 0;
  private endedAt = 0;
  private ended = false;
  private won = false;
  private endScheduledAt = 0;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private raf = 0;
  private lastT = 0;
  private acc = 0;
  private scale = 1;
  private offX = 0;
  private offY = 0;
  private cleanupInput: () => void = () => {};

  constructor(opts: {
    canvas: HTMLCanvasElement;
    level: DemolitionLevel;
    params: DemolitionParams;
    tier: DifficultyTier;
    reducedMotion: boolean;
    sfx?: DemolitionSfx | null;
    haptic?: (pattern: number | number[]) => void;
    onHud: (s: HudState) => void;
    onEnd: (o: Outcome) => void;
  }) {
    this.canvas = opts.canvas;
    this.ctx = opts.canvas.getContext('2d')!;
    this.level = opts.level;
    this.params = opts.params;
    this.tier = opts.tier;
    this.reducedMotion = opts.reducedMotion;
    this.sfx = opts.sfx ?? null;
    this.haptic = opts.haptic ?? (() => {});
    this.onHud = opts.onHud;
    this.onEnd = opts.onEnd;
  }

  start() {
    this.buildWorld();
    this.bindInput();
    this.spawnBall();
    this.startedAt = performance.now();
    this.lastT = this.startedAt;
    this.loop(this.startedAt);
    this.pushHud();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.cleanupInput();
    Engine.clear(this.engine);
  }

  /* ── Monde ──────────────────────────────────────────────────────── */

  private buildWorld() {
    const { level, params } = this;
    const world = this.engine.world;
    this.engine.gravity.y = 1;

    const ground = Bodies.rectangle(level.worldW / 2, level.groundY + 30, level.worldW * 2, 60, {
      isStatic: true, label: 'ground', friction: 0.9,
    });
    const wallR = Bodies.rectangle(level.worldW + 40, level.worldH / 2, 80, level.worldH * 2, { isStatic: true });
    Composite.add(world, [ground, wallR]);

    let topByX = new Map<number, number>(); // colonne approx → y du sommet (pose des cibles)
    for (const spec of level.blocks) {
      if (spec.reinforcement && !params.reinforced) continue;
      const mat = MATERIAL[spec.material];
      const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        label: 'block', density: mat.density, friction: 0.7, restitution: 0.05,
      });
      Sleeping.set(body, true); // la forteresse dort jusqu'au premier impact réel
      const maxHp = spec.material === 'iron' ? Infinity : mat.hp * params.hpMultiplier;
      this.blocks.set(body.id, { hp: maxHp, maxHp, material: spec.material });
      if (spec.material !== 'iron') this.destructible++;
      Composite.add(world, body);
      const col = Math.round(spec.x / 20) * 20;
      const top = spec.y - spec.h / 2;
      if (!topByX.has(col) || top < topByX.get(col)!) topByX.set(col, top);
    }

    for (const t of level.targets) {
      // Pose EXACTE sur le support le plus proche : plus de chute parasite au
      // spawn (cause du bug "victoire automatique").
      const col = Math.round(t.x / 20) * 20;
      const supportTop = topByX.get(col) ?? t.y + t.r;
      const body = Bodies.circle(t.x, supportTop - t.r - 0.5, t.r, {
        label: 'target', density: 0.0008, friction: 0.5, restitution: 0.1,
      });
      Sleeping.set(body, true);
      this.targets.add(body.id);
      Composite.add(world, body);
      // une torche de siège au pied de chaque étendard
      this.torches.push({ x: t.x + 30, y: supportTop + 26 });
    }
    this.totalTargets = this.targets.size;

    Events.on(this.engine, 'collisionStart', (e) => {
      for (const pair of e.pairs) this.handleImpact(pair);
    });
  }

  private handleImpact(pair: Matter.Pair) {
    if (!this.armed) return; // avant le 1er tir, le tassement ne compte JAMAIS
    const { bodyA, bodyB } = pair;
    const speed = Math.hypot(
      bodyA.velocity.x - bodyB.velocity.x,
      bodyA.velocity.y - bodyB.velocity.y,
    );
    if (speed < 1.2) return;
    const ballInvolved = bodyA.label === 'ball' || bodyB.label === 'ball';
    for (const [hit, other] of [[bodyA, bodyB], [bodyB, bodyA]] as const) {
      const impact = speed * Math.min(other.mass, 12);
      if (this.blocks.has(hit.id)) this.damageBlock(hit, impact);
      else if (this.targets.has(hit.id) && impact > 3) this.killTarget(hit);
    }
    if (speed > 4) {
      this.addShake(Math.min(speed * 0.8, 10));
      this.sfx?.impact(Math.min(1, speed / 14));
      if (ballInvolved && speed > 7) {
        this.haptic(20);
        this.addHitstop(28 + Math.min(speed * 2.5, 30)); // impact lourd : ça cogne
        this.zoomPulse = Math.min(this.zoomPulse + 0.025, 0.06);
        const x = (bodyA.position.x + bodyB.position.x) / 2;
        const y = (bodyA.position.y + bodyB.position.y) / 2;
        this.rings.push({ x, y, r: 6, maxR: 46 + speed * 2, life: 280, maxLife: 280, color: '#f0d6a0' });
      }
    }
  }

  private damageBlock(body: Matter.Body, impact: number) {
    const meta = this.blocks.get(body.id);
    if (!meta || meta.hp === Infinity) return;
    if (impact < 4) return;
    meta.hp -= impact;
    if (meta.hp <= 0) {
      this.blocks.delete(body.id);
      Composite.remove(this.engine.world, body);
      this.destroyed++;
      this.debris(body, meta.material);
      this.burst(body.position.x, body.position.y, MATERIAL[meta.material].rim, 10);
      this.addShake(7);
      this.addHitstop(32); // la pierre cède
      this.sfx?.blockDestroyed();
      this.haptic(30);
      this.pushHud();
    } else {
      this.burst(body.position.x, body.position.y, '#b9ad92', 4); // poussière de pierre chaude
    }
  }

  private killTarget(body: Matter.Body) {
    if (!this.targets.has(body.id)) return;
    this.targets.delete(body.id);
    Composite.remove(this.engine.world, body);
    this.targetsDown++;
    const isLast = this.targetsDown === this.totalTargets;
    this.burst(body.position.x, body.position.y, '#f2c200', 26);
    this.rings.push({ x: body.position.x, y: body.position.y, r: 8, maxR: 90, life: 420, maxLife: 420, color: '#f2c200' });
    this.addShake(9);
    if (!isLast) this.addHitstop(55); // étendard abattu : temps suspendu un éclair
    this.sfx?.targetDown(isLast);
    this.haptic(isLast ? [40, 60, 80] : 40);
    if (isLast && !this.reducedMotion) {
      // RALENTI sur le coup final : le temps se suspend, la forteresse tombe
      this.timescale = 0.22;
      this.timescaleTarget = 0.22;
      this.slowMoUntil = performance.now() + 1000;
      this.sfx?.slowMo();
    }
    this.pushHud();
  }

  /* ── Tir ────────────────────────────────────────────────────────── */

  private spawnBall() {
    const { slingX, slingY } = this.level;
    this.ball = Bodies.circle(slingX, slingY, BALL_R, {
      label: 'ball', density: 0.006, friction: 0.4, restitution: 0.35, isStatic: true,
    });
    this.ballInFlight = false;
    this.trail = [];
    Composite.add(this.engine.world, this.ball);
  }

  private launch() {
    if (!this.ball || !this.dragPos) return;
    const dx = this.level.slingX - this.dragPos.x;
    const dy = this.level.slingY - this.dragPos.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) { this.resetDrag(); return; } // micro-drag = annulation
    // premier tir : la forteresse se réveille, les dégâts deviennent réels
    if (!this.armed) {
      this.armed = true;
      for (const b of Composite.allBodies(this.engine.world)) Sleeping.set(b, false);
    }
    Body.setStatic(this.ball, false);
    Body.setVelocity(this.ball, { x: dx * LAUNCH_POWER, y: dy * LAUNCH_POWER });
    this.ballInFlight = true;
    this.flightSince = performance.now();
    this.settleSince = 0;
    this.shotsUsed++;
    this.dragging = false;
    this.dragPos = null;
    this.dragFrac = 0;
    this.chargedHaptic = false;
    this.sfx?.launch();
    this.haptic(15);
    this.addShake(4);
    this.pushHud();
  }

  private resetDrag() {
    if (this.ball && !this.ballInFlight) {
      Body.setPosition(this.ball, { x: this.level.slingX, y: this.level.slingY });
    }
    this.dragging = false;
    this.dragPos = null;
  }

  /* ── Boucle ─────────────────────────────────────────────────────── */

  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(t - this.lastT, 50);
    this.lastT = t;

    // HITSTOP : on gèle la simulation quelques ms sur un impact lourd. Le monde
    // se fige, le shake reste plein → l'impact « cogne » avant de reprendre.
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.acc = 0;          // pas de rattrapage physique au dégel
      this.render(t);
      return;
    }

    // retour fluide du ralenti vers le temps réel
    if (this.slowMoUntil && t > this.slowMoUntil) {
      this.timescaleTarget = 1;
      this.slowMoUntil = 0;
    }
    this.timescale += (this.timescaleTarget - this.timescale) * Math.min(1, dt * 0.004);

    this.acc += dt;
    while (this.acc >= 1000 / 60) {
      Engine.update(this.engine, (1000 / 60) * this.timescale);
      this.acc -= 1000 / 60;
    }
    this.tickGame(t, dt);
    this.render(t);
  };

  private tickGame(t: number, dt: number) {
    // particules (en temps réel : contraste stylé pendant le ralenti)
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += (p.kind === 'dust' ? 0.004 : 0.018) * dt;
      p.rot += p.vr * dt;
      return p.life > 0;
    });
    this.rings = this.rings.filter((r) => {
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 0.02);
      return r.life > 0;
    });
    this.shake = Math.max(0, this.shake - dt * 0.02);
    this.zoomPulse = Math.max(0, this.zoomPulse - dt * 0.0002);

    // cibles tombées au sol = abattues (uniquement une fois le siège engagé)
    if (this.armed) {
      for (const body of Composite.allBodies(this.engine.world)) {
        if (this.targets.has(body.id) && body.position.y > this.level.groundY - 26) {
          this.killTarget(body);
        }
      }
    }

    // feux d'artifice de victoire en vagues
    if (this.won && this.fireworkWaves > 0 && t >= this.nextFireworkAt) {
      this.fireworkWave();
      this.fireworkWaves--;
      this.nextFireworkAt = t + 320;
    }

    if (this.ended) return;

    // chrono (palier OR) + tics d'urgence
    if (this.params.timeLimitS > 0) {
      const leftS = this.params.timeLimitS - (t - this.startedAt) / 1000;
      if (leftS <= 0) { this.finish(t); return; }
      const whole = Math.ceil(leftS);
      if (whole <= 10 && whole !== this.lastTickSecond) {
        this.lastTickSecond = whole;
        this.sfx?.tick();
        this.pushHud();
      }
    }

    if (this.isWin()) { this.finish(t); return; }

    if (this.ballInFlight && this.ball) {
      const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.y);
      const out =
        this.ball.position.y > this.level.worldH + 80 ||
        this.ball.position.x < -80 ||
        this.ball.position.x > this.level.worldW + 80;
      if (speed < SETTLE_SPEED) {
        if (!this.settleSince) this.settleSince = t;
      } else this.settleSince = 0;
      const settled = this.settleSince && t - this.settleSince > SETTLE_MS;
      const timedOut = t - this.flightSince > SHOT_TIMEOUT_MS;
      if (out || settled || timedOut) {
        Composite.remove(this.engine.world, this.ball);
        this.ball = null;
        this.ballInFlight = false;
        if (this.shotsUsed < this.params.maxShots) {
          this.spawnBall();
          this.pushHud();
        } else {
          // plus de boulets : on laisse l'effondrement finir avant de conclure
          this.endScheduledAt = t + END_GRACE_MS;
        }
      }
    }

    if (this.endScheduledAt && t >= this.endScheduledAt) this.finish(t);
  }

  private isWin(): boolean {
    return this.armed
      && this.shotsUsed >= 1
      && this.targetsDown === this.totalTargets
      && this.destructionPct() >= this.params.targetPct;
  }

  private destructionPct(): number {
    return this.destructible === 0 ? 0 : Math.round((this.destroyed / this.destructible) * 100);
  }

  private finish(t: number) {
    if (this.ended) return;
    this.ended = true;
    this.endedAt = t;
    this.won = this.isWin();
    if (this.won) {
      this.fireworkWaves = 4;
      this.nextFireworkAt = t;
      this.sfx?.victory();
      this.haptic([60, 80, 60, 80, 120]);
    } else {
      this.sfx?.defeat();
    }
    this.pushHud();
    const timeLeftMs = this.params.timeLimitS > 0
      ? Math.max(0, this.params.timeLimitS * 1000 - (t - this.startedAt))
      : 0;
    // on laisse respirer la mise en scène avant l'écran de résultat
    this.endTimer = setTimeout(() => {
      this.onEnd({
        win: this.won,
        shotsUsed: this.shotsUsed,
        destructionPct: this.destructionPct(),
        targetsDown: this.targetsDown,
        totalTargets: this.totalTargets,
        timeLeftMs: Math.round(timeLeftMs),
        totalBlocks: this.destructible,
        blocksDestroyed: this.destroyed,
      });
    }, this.won ? 2100 : 1000);
  }

  private pushHud() {
    const t = performance.now();
    const timeLeftS = this.params.timeLimitS > 0
      ? Math.max(0, Math.ceil(this.params.timeLimitS - (((this.ended ? this.endedAt : t) - this.startedAt) / 1000)))
      : null;
    this.onHud({
      shotsLeft: Math.max(0, this.params.maxShots - this.shotsUsed),
      destructionPct: this.destructionPct(),
      targetsDown: this.targetsDown,
      totalTargets: this.totalTargets,
      timeLeftS,
      phase: this.ended ? 'ended' : this.ballInFlight ? 'flight' : 'aim',
      interacted: this.interacted,
    });
  }

  /* ── Effets ─────────────────────────────────────────────────────── */

  private addShake(v: number) {
    if (this.reducedMotion) return;
    this.shake = Math.min(this.shake + v, 16);
  }

  /** Gel d'image bref. Jamais pendant le ralenti final (lecture brouillée). */
  private addHitstop(ms: number) {
    if (this.reducedMotion || this.timescale < 0.85) return;
    this.hitstop = Math.min(70, Math.max(this.hitstop, ms));
  }

  private burst(x: number, y: number, color: string, n: number) {
    if (this.reducedMotion) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 4;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5,
        life: 400 + Math.random() * 500, maxLife: 900,
        size: 2 + Math.random() * 4, color, kind: 'spark',
        rot: 0, vr: 0, w: 0, h: 0,
      });
    }
  }

  /** Débris physiques stylisés : le bloc éclate en 4–6 fragments rotatifs. */
  private debris(body: Matter.Body, material: BlockMaterial) {
    const n = this.reducedMotion ? 2 : 4 + Math.floor(Math.random() * 3);
    const mat = MATERIAL[material];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x: body.position.x + (Math.random() - 0.5) * 20,
        y: body.position.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5,
        life: 700 + Math.random() * 600, maxLife: 1300,
        size: 0, color: mat.base, kind: 'chunk',
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.012,
        w: 6 + Math.random() * 10, h: 4 + Math.random() * 7,
      });
    }
    // nuage de poussière qui retombe lentement
    for (let i = 0; i < (this.reducedMotion ? 2 : 6); i++) {
      this.particles.push({
        x: body.position.x + (Math.random() - 0.5) * 30,
        y: body.position.y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 1.2, vy: -0.4 - Math.random() * 0.8,
        life: 900 + Math.random() * 700, maxLife: 1600,
        size: 8 + Math.random() * 14, color: 'rgba(201,178,140,0.32)', kind: 'dust',
        rot: 0, vr: 0, w: 0, h: 0,
      });
    }
  }

  /** Une vague de feux d'artifice tricolores au-dessus des ruines. */
  private fireworkWave() {
    const cols = ['#0a5a9e', '#f2f4f8', '#e1000f', '#e3c463']; // tricolore + or
    const cx = this.level.worldW * (0.45 + Math.random() * 0.4);
    const cy = 90 + Math.random() * 140;
    this.rings.push({ x: cx, y: cy, r: 4, maxR: 70, life: 360, maxLife: 360, color: cols[Math.floor(Math.random() * 4)] });
    const n = this.reducedMotion ? 10 : 36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = 2.5 + Math.random() * 3.5;
      this.particles.push({
        x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 700 + Math.random() * 700, maxLife: 1400,
        size: 2.5 + Math.random() * 3, color: cols[i % cols.length], kind: 'spark',
        rot: 0, vr: 0, w: 0, h: 0,
      });
    }
    this.addShake(5);
  }

  /* ── Entrées ────────────────────────────────────────────────────── */

  private toWorld(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.offX / devicePixelRatio) / (this.scale / devicePixelRatio),
      y: (e.clientY - rect.top - this.offY / devicePixelRatio) / (this.scale / devicePixelRatio),
    };
  }

  private bindInput() {
    const down = (e: PointerEvent) => {
      if (this.ended || this.ballInFlight || !this.ball) return;
      const p = this.toWorld(e);
      const d = Math.hypot(p.x - this.ball.position.x, p.y - this.ball.position.y);
      if (d < 120) {
        this.dragging = true;
        this.chargedHaptic = false;
        if (!this.interacted) { this.interacted = true; this.pushHud(); }
        this.canvas.setPointerCapture(e.pointerId);
        move(e);
      }
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging || !this.ball) return;
      const p = this.toWorld(e);
      let dx = p.x - this.level.slingX;
      let dy = p.y - this.level.slingY;
      const d = Math.hypot(dx, dy);
      if (d > MAX_DRAG) { dx = (dx / d) * MAX_DRAG; dy = (dy / d) * MAX_DRAG; }
      this.dragFrac = Math.min(1, d / MAX_DRAG);
      // un seul buzz quand l'élastique est tendu à fond (limite de portée)
      if (this.dragFrac > 0.96 && !this.chargedHaptic) { this.chargedHaptic = true; this.haptic(8); }
      else if (this.dragFrac < 0.9) this.chargedHaptic = false;
      this.dragPos = { x: this.level.slingX + dx, y: this.level.slingY + dy };
      Body.setPosition(this.ball, this.dragPos);
    };
    const up = () => {
      if (this.dragging) this.launch();
    };
    this.canvas.addEventListener('pointerdown', down);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    this.cleanupInput = () => {
      this.canvas.removeEventListener('pointerdown', down);
      this.canvas.removeEventListener('pointermove', move);
      this.canvas.removeEventListener('pointerup', up);
      this.canvas.removeEventListener('pointercancel', up);
    };
  }

  /* ── Rendu ──────────────────────────────────────────────────────── */

  private render(t: number) {
    const { ctx, canvas, level } = this;
    const dpr = devicePixelRatio || 1;
    const cw = canvas.clientWidth * dpr;
    const ch = canvas.clientHeight * dpr;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    this.scale = Math.min(cw / level.worldW, ch / level.worldH);
    this.offX = (cw - level.worldW * this.scale) / 2;
    this.offY = (ch - level.worldH * this.scale) / 2;

    // ciel du palier : nuit → ambre incandescent → sol brun chaud
    const sky = TIER_SKY[this.tier];
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, sky.top);
    bg.addColorStop(0.42, sky.mid);
    bg.addColorStop(0.70, sky.horizon);
    bg.addColorStop(0.80, sky.glow);
    bg.addColorStop(0.90, '#6e3a1e');
    bg.addColorStop(1, sky.ground);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake * this.scale * 0.6;
      sy = (Math.random() - 0.5) * this.shake * this.scale * 0.6;
    }
    // punch-zoom centré sur la forteresse
    const zoom = 1 + this.zoomPulse;
    ctx.translate(this.offX + sx, this.offY + sy);
    ctx.scale(this.scale * zoom, this.scale * zoom);
    if (zoom !== 1) {
      ctx.translate(-(zoom - 1) * level.worldW * 0.62, -(zoom - 1) * level.worldH * 0.6);
    }

    this.drawBackdrop(ctx, t);
    this.drawCrowd(ctx, t);
    this.drawGround(ctx);
    this.drawSling(ctx);
    this.drawNextPave(ctx);
    this.drawBodies(ctx, t);
    this.drawTorches(ctx, t);
    if (this.dragging && this.dragPos) this.drawAim(ctx);
    this.drawRings(ctx);
    this.drawParticles(ctx);

    // vignette de ralenti : le monde retient son souffle
    if (this.timescale < 0.9) {
      ctx.restore();
      const v = (0.9 - this.timescale) * 0.9;
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.25, cw / 2, ch / 2, ch * 0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(8,4,16,${0.55 * v})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      return;
    }
    ctx.restore();
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, t: number) {
    const { level } = this;
    const sky = TIER_SKY[this.tier];
    const horizonY = level.groundY - 8;

    // halo ambre incandescent à l'horizon (l'incendie de la ville)
    const glow = ctx.createRadialGradient(
      level.worldW * 0.52, horizonY, 20,
      level.worldW * 0.52, horizonY, level.worldW * 0.55,
    );
    glow.addColorStop(0, this.hexA(sky.glow, 0.5));
    glow.addColorStop(0.5, this.hexA(sky.glow, 0.16));
    glow.addColorStop(1, this.hexA(sky.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, level.groundY - 240, level.worldW, 240);

    // lune chaude, basse et pleine
    const moonX = level.worldW * 0.74, moonY = 92;
    const mg = ctx.createRadialGradient(moonX - 6, moonY - 6, 4, moonX, moonY, 30);
    mg.addColorStop(0, '#fbf0d2');
    mg.addColorStop(0.6, sky.moon);
    mg.addColorStop(1, this.hexA(sky.moon, 0.65));
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
    ctx.fill();
    // halo lunaire
    ctx.fillStyle = this.hexA(sky.moon, 0.12);
    ctx.beginPath();
    ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
    ctx.fill();

    // étoiles discrètes (scintillement déterministe)
    let seed = 991;
    ctx.fillStyle = '#f3ead0';
    for (let i = 0; i < 26; i++) {
      seed = (seed * 16807) % 2147483647;
      const sxp = (seed % 1000) / 1000 * level.worldW;
      seed = (seed * 16807) % 2147483647;
      const syp = (seed % 1000) / 1000 * (level.groundY - 220);
      const tw = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.001 + i));
      ctx.globalAlpha = tw * 0.6;
      ctx.fillRect(sxp, syp, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;

    // ── silhouette de Paris : Notre-Dame + toits de zinc, fenêtres ambre ──
    this.drawSkyline(ctx, t);
  }

  /** Silhouette chaude et réelle : tours jumelles de Notre-Dame + faubourg. */
  private drawSkyline(ctx: CanvasRenderingContext2D, t: number) {
    const { level } = this;
    const baseY = level.groundY - 4;
    ctx.fillStyle = '#0c0a09';

    // Notre-Dame (deux tours + nef), à gauche
    const nd = level.worldW * 0.12;
    ctx.fillRect(nd, baseY - 92, 20, 92);
    ctx.fillRect(nd + 30, baseY - 92, 20, 92);
    ctx.fillRect(nd + 12, baseY - 62, 26, 62);   // nef entre les tours
    ctx.fillRect(nd + 22, baseY - 116, 6, 26);    // flèche

    // toits de zinc du faubourg (gauche et droite), profils irréguliers
    let seed = 17;
    const roof = (x0: number, x1: number) => {
      let x = x0;
      while (x < x1) {
        seed = (seed * 16807) % 2147483647;
        const w = 26 + (seed % 40);
        const h = 30 + (seed % 56);
        ctx.fillRect(x, baseY - h, w, h);
        // toit mansardé incliné
        ctx.beginPath();
        ctx.moveTo(x, baseY - h);
        ctx.lineTo(x + w * 0.5, baseY - h - 10 - (seed % 8));
        ctx.lineTo(x + w, baseY - h);
        ctx.closePath();
        ctx.fill();
        x += w + 2;
      }
    };
    roof(level.worldW * 0.2, level.worldW * 0.34);
    roof(level.worldW * 0.78, level.worldW * 0.99);

    // fenêtres allumées (ambre ponctuel qui vacille)
    let s2 = 53;
    for (let i = 0; i < 14; i++) {
      s2 = (s2 * 16807) % 2147483647;
      const wx = level.worldW * (0.21 + (s2 % 100) / 100 * 0.13);
      s2 = (s2 * 16807) % 2147483647;
      const side = i % 3 === 0 ? level.worldW * (0.79 + (s2 % 100) / 100 * 0.18) : wx;
      const wy = baseY - 16 - (s2 % 40);
      const flick = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.003 + i * 2));
      ctx.fillStyle = this.hexA('#e0964a', 0.7 * flick);
      ctx.fillRect(side, wy, 2, 3.5);
    }
  }

  /** La foule en marche : piques et bonnets en ombre chinoise, côté canon. */
  private drawCrowd(ctx: CanvasRenderingContext2D, t: number) {
    const { level } = this;
    const baseY = level.groundY;
    ctx.fillStyle = 'rgba(8,10,14,0.85)';
    let seed = 13;
    for (let i = 0; i < 9; i++) {
      seed = (seed * 16807) % 2147483647;
      const px = 14 + i * 11 + (seed % 6);
      const sway = Math.sin(t * 0.002 + i * 1.7) * 1.2;
      const h = 26 + (seed % 12);
      // corps + tête
      ctx.fillRect(px - 3, baseY - h, 6, h);
      ctx.beginPath();
      ctx.arc(px + sway * 0.4, baseY - h - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // pique levée (une sur deux)
      if (i % 2 === 0) {
        ctx.strokeStyle = 'rgba(8,10,14,0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px + 4, baseY - h + 6);
        ctx.lineTo(px + 8 + sway, baseY - h - 26);
        ctx.stroke();
        ctx.fillRect(px + 6 + sway, baseY - h - 32, 4, 7);
      }
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const { level } = this;
    // esplanade sombre chaude (pavés du faubourg), dégradé vers le bas
    const g = ctx.createLinearGradient(0, level.groundY, 0, level.worldH);
    g.addColorStop(0, '#1b140d');
    g.addColorStop(1, '#0b0705');
    ctx.fillStyle = g;
    ctx.fillRect(-100, level.groundY, level.worldW + 200, level.worldH - level.groundY + 100);
    // liseré ambre fin (pas de néon, pas de blur froid)
    const liser = ctx.createLinearGradient(0, 0, level.worldW, 0);
    liser.addColorStop(0, 'rgba(224,150,74,0)');
    liser.addColorStop(0.5, 'rgba(224,150,74,0.4)');
    liser.addColorStop(1, 'rgba(224,150,74,0)');
    ctx.fillStyle = liser;
    ctx.fillRect(0, level.groundY - 1, level.worldW, 2);
    // joints de pavés suggérés
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let x = 20; x < level.worldW; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, level.groundY + 6);
      ctx.lineTo(x - 14, level.worldH);
      ctx.stroke();
    }
  }

  private drawSling(ctx: CanvasRenderingContext2D) {
    const { slingX, slingY, groundY } = this.level;
    // fourches en bois chaud, volume par dégradé
    const wood = ctx.createLinearGradient(slingX - 16, 0, slingX + 16, 0);
    wood.addColorStop(0, '#4a3318');
    wood.addColorStop(0.5, '#8a6230');
    wood.addColorStop(1, '#5a3f22');
    ctx.strokeStyle = wood;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(slingX - 15, groundY);
    ctx.lineTo(slingX - 7, slingY + 6);
    ctx.moveTo(slingX + 15, groundY);
    ctx.lineTo(slingX + 7, slingY + 6);
    ctx.stroke();
    // élastique cuir : s'épaissit et chauffe vers le vermillon avec la tension
    if (this.ball && !this.ballInFlight) {
      const f = this.dragging ? this.dragFrac : 0;
      // teinte cuir → ambre → vermillon selon la charge
      const taut = f > 0.5
        ? this.mixHex('#8a5a24', '#bb2e2a', (f - 0.5) * 2)
        : this.mixHex('#3a2814', '#8a5a24', f * 2);
      ctx.strokeStyle = taut;
      ctx.lineWidth = 3.5 + f * 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(slingX - 9, slingY + 2);
      ctx.lineTo(this.ball.position.x, this.ball.position.y);
      ctx.lineTo(slingX + 9, slingY + 2);
      ctx.stroke();
    }
  }

  /** Interpolation linéaire entre deux couleurs hex. */
  private mixHex(a: string, b: string, k: number): string {
    k = Math.max(0, Math.min(1, k));
    const na = parseInt(a.slice(1), 16), nb = parseInt(b.slice(1), 16);
    const r = Math.round(((na >> 16) & 255) + (((nb >> 16) & 255) - ((na >> 16) & 255)) * k);
    const g = Math.round(((na >> 8) & 255) + (((nb >> 8) & 255) - ((na >> 8) & 255)) * k);
    const bl = Math.round((na & 255) + ((nb & 255) - (na & 255)) * k);
    return `rgb(${r},${g},${bl})`;
  }

  /** hex (#rrggbb) → rgba(...) avec alpha — pour les halos/dégradés chauds. */
  private hexA(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  private drawAim(ctx: CanvasRenderingContext2D) {
    if (!this.dragPos) return;
    const { slingX, slingY } = this.level;
    const vx = (slingX - this.dragPos.x) * LAUNCH_POWER;
    const vy = (slingY - this.dragPos.y) * LAUNCH_POWER;
    ctx.fillStyle = 'rgba(242,244,248,0.7)';
    // prévisualisation balistique (mêmes constantes que la physique)
    let px = this.dragPos.x, py = this.dragPos.y, tvx = vx, tvy = vy;
    for (let i = 0; i < 16; i++) {
      for (let s = 0; s < 4; s++) {
        px += tvx; py += tvy;
        tvy += this.engine.gravity.y * 0.55;
        tvx *= 0.999; tvy *= 0.999;
      }
      if (py > this.level.groundY) break;
      ctx.beginPath();
      ctx.arc(px, py, 3.2 - i * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTorches(ctx: CanvasRenderingContext2D, t: number) {
    for (const [i, torch] of this.torches.entries()) {
      const flick = 0.7 + 0.3 * Math.sin(t * 0.011 + i * 2.1) * Math.cos(t * 0.007 + i);
      // halo
      const grad = ctx.createRadialGradient(torch.x, torch.y, 2, torch.x, torch.y, 26 * flick);
      grad.addColorStop(0, 'rgba(255,176,64,0.5)');
      grad.addColorStop(1, 'rgba(255,126,46,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(torch.x - 28, torch.y - 28, 56, 56);
      // flamme
      ctx.fillStyle = '#ffb040';
      ctx.beginPath();
      ctx.ellipse(torch.x, torch.y - 3, 2.6, 5 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBodies(ctx: CanvasRenderingContext2D, t: number) {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (body.label === 'block') {
        const meta = this.blocks.get(body.id);
        if (!meta) continue;
        this.drawStone(ctx, body, MATERIAL[meta.material], meta);
      } else if (body.label === 'target') {
        this.drawStandard(ctx, body, t);
      } else if (body.label === 'ball') {
        this.drawPave(ctx, body);
      }
    }
  }

  /** Bloc de pierre de taille : volume (faces éclairée/occlusion) + rim ambre. */
  private drawStone(ctx: CanvasRenderingContext2D, body: Matter.Body, mat: typeof MATERIAL[BlockMaterial], meta: BlockMeta) {
    const v = body.vertices;
    const w = Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y);
    const h = Math.hypot(v[2].x - v[1].x, v[2].y - v[1].y);
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    // base : dégradé diagonal (lumière en haut-gauche)
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, mat.light);
    g.addColorStop(0.5, mat.base);
    g.addColorStop(1, mat.dark);
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // occlusion ambiante en bas/droite (le bloc a du poids)
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(-w / 2, h / 2 - 3.5, w, 3.5);
    ctx.fillRect(w / 2 - 3.5, -h / 2, 3.5, h);
    // rim-light ambre en haut/gauche (torches qui lèchent l'arête)
    ctx.fillStyle = this.hexA(mat.rim, 0.55);
    ctx.fillRect(-w / 2, -h / 2, w, 1.6);
    ctx.fillRect(-w / 2, -h / 2, 1.6, h);
    // joint de pierre central (appareil)
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
    ctx.stroke();
    // contour
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    // fissures selon les dégâts
    if (meta.maxHp !== Infinity && meta.hp < meta.maxHp * 0.66) {
      ctx.strokeStyle = 'rgba(12,8,5,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, -8); ctx.lineTo(2, 0); ctx.lineTo(-3, 9);
      if (meta.hp < meta.maxHp * 0.33) { ctx.moveTo(8, -9); ctx.lineTo(4, 2); }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Cible = étendard royal vermillon (drapeau à queue d'aronde sur hampe). */
  private drawStandard(ctx: CanvasRenderingContext2D, body: Matter.Body, t: number) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    const wave = Math.sin(t * 0.005 + body.position.x) * 1.6;
    // hampe
    ctx.fillStyle = '#2b2114';
    ctx.fillRect(-1.5, -20, 3, 40);
    // pointe de hampe dorée
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(0, -22, 3, 0, Math.PI * 2);
    ctx.fill();
    // drapeau vermillon à queue d'aronde
    const fg = ctx.createLinearGradient(0, -18, 0, -4);
    fg.addColorStop(0, '#cf3a33');
    fg.addColorStop(1, '#9c211d');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.lineTo(24 + wave, -18);
    ctx.lineTo(18 + wave, -11);
    ctx.lineTo(24 + wave, -4);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();
    // liseré or + fleur de lys
    ctx.strokeStyle = this.hexA('#e3c463', 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e3c463';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚜', 11 + wave * 0.5, -11);
    ctx.restore();
  }

  /** Projectile = LE PAVÉ parisien : pierre de taille biseautée, rim ambre. */
  private drawPave(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    // traînée de poussière chaude (pas de trail néon)
    this.trail.push({ x: body.position.x, y: body.position.y });
    if (this.trail.length > 12) this.trail.shift();
    if (this.ballInFlight) {
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        const k = i / this.trail.length;
        ctx.fillStyle = `rgba(201,178,140,${k * 0.28})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, BALL_R * k * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // charge : le pavé enfle légèrement et s'auréole d'ambre quand on tend
    const f = !this.ballInFlight && this.dragging ? this.dragFrac : 0;
    if (f > 0.05) {
      const halo = ctx.createRadialGradient(body.position.x, body.position.y, BALL_R * 0.6, body.position.x, body.position.y, BALL_R * (1.8 + f));
      halo.addColorStop(0, this.hexA('#e0964a', 0.35 * f));
      halo.addColorStop(1, this.hexA('#e0964a', 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, BALL_R * (1.8 + f), 0, Math.PI * 2);
      ctx.fill();
    }
    const s = BALL_R * 1.9 * (1 + f * 0.12);
    const r = 4;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle); // micro-rotation en vol
    // ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.roundRect(ctx, -s / 2 + 2, -s / 2 + 3, s, s, r);
    ctx.fill();
    // corps pierre de taille
    const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    g.addColorStop(0, '#efe6cd');
    g.addColorStop(0.58, '#cdbf9b');
    g.addColorStop(1, '#9d916f');
    ctx.fillStyle = g;
    this.roundRect(ctx, -s / 2, -s / 2, s, s, r);
    ctx.fill();
    // occlusion bas-droite (biseau)
    ctx.fillStyle = 'rgba(21,17,12,0.28)';
    ctx.fillRect(-s / 2, s / 2 - 3, s, 3);
    ctx.fillRect(s / 2 - 3, -s / 2, 3, s);
    // rim-light ambre haut-gauche
    ctx.fillStyle = this.hexA('#e0964a', 0.6);
    ctx.fillRect(-s / 2 + 1, -s / 2 + 1, s - 2, 1.4);
    // rainures de joint (croix de taille)
    ctx.strokeStyle = 'rgba(21,17,12,0.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-s / 2 + 3, 0.5); ctx.lineTo(s / 2 - 3, 0.5);
    ctx.moveTo(0.5, -s / 2 + 3); ctx.lineTo(0.5, s / 2 - 3);
    ctx.stroke();
    ctx.restore();
  }

  /** Pavé SUIVANT pré-chargé dans le creux de la fronde pendant un tir — le
   *  rythme ne casse pas entre deux coups (continuité « encore un coup »). */
  private drawNextPave(ctx: CanvasRenderingContext2D) {
    if (!this.ballInFlight || this.shotsUsed >= this.params.maxShots) return;
    const { slingX, slingY } = this.level;
    const s = BALL_R * 1.5;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(slingX, slingY + 2);
    const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    g.addColorStop(0, '#cdbf9b');
    g.addColorStop(1, '#7d735a');
    ctx.fillStyle = g;
    this.roundRect(ctx, -s / 2, -s / 2, s, s, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(21,17,12,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s / 2 + 2, 0); ctx.lineTo(s / 2 - 2, 0);
    ctx.moveTo(0, -s / 2 + 2); ctx.lineTo(0, s / 2 - 2);
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  private drawRings(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      if (p.kind === 'chunk') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      } else if (p.kind === 'dust') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
