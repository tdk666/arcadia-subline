import Matter from 'matter-js';
import type { BlockMaterial, DemolitionLevel, DemolitionParams } from './types';

const { Engine, Bodies, Body, Composite, Events } = Matter;

/* ── Réglages matière ─────────────────────────────────────────────── */
const MATERIAL = {
  stone: { hp: 26, density: 0.0024, color: '#3b4a5e', edge: '#6ec4e8' },
  wood: { hp: 14, density: 0.0012, color: '#6b4a26', edge: '#d9a45a' },
  iron: { hp: Infinity, density: 0.005, color: '#444c58', edge: '#cf009e' },
} as const satisfies Record<BlockMaterial, unknown>;

const BALL_R = 15;
const MAX_DRAG = 95;
const LAUNCH_POWER = 0.205;
const SETTLE_SPEED = 0.18;
const SETTLE_MS = 900;
const SHOT_TIMEOUT_MS = 6500;
const END_GRACE_MS = 1600;

export interface HudState {
  shotsLeft: number;
  destructionPct: number;
  targetsDown: number;
  totalTargets: number;
  timeLeftS: number | null;
  phase: 'aim' | 'flight' | 'ended';
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
}

interface BlockMeta { hp: number; maxHp: number; material: BlockMaterial }

export class DemolitionEngine {
  private engine = Engine.create({ enableSleeping: true });
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: DemolitionLevel;
  private params: DemolitionParams;
  private reducedMotion: boolean;
  private onHud: (s: HudState) => void;
  private onEnd: (o: Outcome) => void;

  private blocks = new Map<number, BlockMeta>();
  private targets = new Set<number>();
  private totalTargets = 0;
  private destructible = 0;
  private destroyed = 0;
  private targetsDown = 0;

  private ball: Matter.Body | null = null;
  private ballInFlight = false;
  private shotsUsed = 0;
  private dragging = false;
  private dragPos: { x: number; y: number } | null = null;
  private settleSince = 0;
  private flightSince = 0;
  private trail: { x: number; y: number }[] = [];

  private particles: Particle[] = [];
  private shake = 0;
  private startedAt = 0;
  private endedAt = 0;
  private ended = false;
  private endScheduledAt = 0;
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
    reducedMotion: boolean;
    onHud: (s: HudState) => void;
    onEnd: (o: Outcome) => void;
  }) {
    this.canvas = opts.canvas;
    this.ctx = opts.canvas.getContext('2d')!;
    this.level = opts.level;
    this.params = opts.params;
    this.reducedMotion = opts.reducedMotion;
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

    for (const spec of level.blocks) {
      if (spec.reinforcement && !params.reinforced) continue;
      const mat = MATERIAL[spec.material];
      const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        label: 'block', density: mat.density, friction: 0.7, restitution: 0.05,
      });
      const maxHp = spec.material === 'iron' ? Infinity : mat.hp * params.hpMultiplier;
      this.blocks.set(body.id, { hp: maxHp, maxHp, material: spec.material });
      if (spec.material !== 'iron') this.destructible++;
      Composite.add(world, body);
    }

    for (const t of level.targets) {
      const body = Bodies.circle(t.x, t.y, t.r, {
        label: 'target', density: 0.0008, friction: 0.5, restitution: 0.1,
      });
      this.targets.add(body.id);
      Composite.add(world, body);
    }
    this.totalTargets = this.targets.size;

    Events.on(this.engine, 'collisionStart', (e) => {
      for (const pair of e.pairs) this.handleImpact(pair);
    });
  }

  private handleImpact(pair: Matter.Pair) {
    const { bodyA, bodyB } = pair;
    const speed = Math.hypot(
      bodyA.velocity.x - bodyB.velocity.x,
      bodyA.velocity.y - bodyB.velocity.y,
    );
    if (speed < 1.2) return;
    for (const [hit, other] of [[bodyA, bodyB], [bodyB, bodyA]] as const) {
      const impact = speed * Math.min(other.mass, 12);
      if (this.blocks.has(hit.id)) this.damageBlock(hit, impact);
      else if (this.targets.has(hit.id) && impact > 3) this.killTarget(hit);
    }
    if (speed > 4) this.addShake(Math.min(speed * 0.8, 10));
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
      this.burst(body.position.x, body.position.y, MATERIAL[meta.material].edge, 16);
      this.addShake(7);
      this.pushHud();
    } else {
      this.burst(body.position.x, body.position.y, '#9aa6b4', 4);
    }
  }

  private killTarget(body: Matter.Body) {
    if (!this.targets.has(body.id)) return;
    this.targets.delete(body.id);
    Composite.remove(this.engine.world, body);
    this.targetsDown++;
    this.burst(body.position.x, body.position.y, '#f2c200', 26);
    this.addShake(9);
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
    Body.setStatic(this.ball, false);
    Body.setVelocity(this.ball, { x: dx * LAUNCH_POWER, y: dy * LAUNCH_POWER });
    this.ballInFlight = true;
    this.flightSince = performance.now();
    this.settleSince = 0;
    this.shotsUsed++;
    this.dragging = false;
    this.dragPos = null;
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
    this.acc += dt;
    while (this.acc >= 1000 / 60) {
      Engine.update(this.engine, 1000 / 60);
      this.acc -= 1000 / 60;
    }
    this.tickGame(t, dt);
    this.render(t);
  };

  private tickGame(t: number, dt: number) {
    // particules
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += 0.018 * dt;
      return p.life > 0;
    });
    this.shake = Math.max(0, this.shake - dt * 0.02);

    // cibles tombées au sol = abattues
    for (const body of Composite.allBodies(this.engine.world)) {
      if (this.targets.has(body.id) && body.position.y > this.level.groundY - 26) {
        this.killTarget(body);
      }
    }

    if (this.ended) return;

    // chrono (palier OR)
    if (this.params.timeLimitS > 0 && t - this.startedAt > this.params.timeLimitS * 1000) {
      this.finish(t);
      return;
    }

    if (this.isWin()) {
      // victoire immédiate dès que les conditions sont remplies
      this.finish(t);
      return;
    }

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
    return this.targetsDown === this.totalTargets && this.destructionPct() >= this.params.targetPct;
  }

  private destructionPct(): number {
    return this.destructible === 0 ? 0 : Math.round((this.destroyed / this.destructible) * 100);
  }

  private finish(t: number) {
    if (this.ended) return;
    this.ended = true;
    this.endedAt = t;
    const win = this.isWin();
    if (win) this.victoryBurst();
    this.pushHud();
    const timeLeftMs = this.params.timeLimitS > 0
      ? Math.max(0, this.params.timeLimitS * 1000 - (t - this.startedAt))
      : 0;
    // petit délai pour laisser respirer l'animation de fin
    setTimeout(() => {
      this.onEnd({
        win,
        shotsUsed: this.shotsUsed,
        destructionPct: this.destructionPct(),
        targetsDown: this.targetsDown,
        totalTargets: this.totalTargets,
        timeLeftMs: Math.round(timeLeftMs),
        totalBlocks: this.destructible,
        blocksDestroyed: this.destroyed,
      });
    }, win ? 1400 : 900);
  }

  private pushHud() {
    const t = performance.now();
    const timeLeftS = this.params.timeLimitS > 0
      ? Math.max(0, Math.ceil(this.params.timeLimitS - (((this.ended ? this.endedAt : t) - this.startedAt) / 1000)))
      : null;
    this.onHud({
      shotsLeft: Math.max(0, this.params.maxShots - this.shotsUsed) + (this.ball && !this.ballInFlight ? 0 : 0),
      destructionPct: this.destructionPct(),
      targetsDown: this.targetsDown,
      totalTargets: this.totalTargets,
      timeLeftS,
      phase: this.ended ? 'ended' : this.ballInFlight ? 'flight' : 'aim',
    });
  }

  /* ── Effets ─────────────────────────────────────────────────────── */

  private addShake(v: number) {
    if (this.reducedMotion) return;
    this.shake = Math.min(this.shake + v, 16);
  }

  private burst(x: number, y: number, color: string, n: number) {
    if (this.reducedMotion) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 4;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5,
        life: 400 + Math.random() * 500, maxLife: 900,
        size: 2 + Math.random() * 4, color,
      });
    }
  }

  private victoryBurst() {
    const cols = ['#0064b0', '#f2f4f8', '#e1000f', '#f2c200'];
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 6;
      this.particles.push({
        x: this.level.worldW * 0.7 + (Math.random() - 0.5) * 300,
        y: this.level.groundY - 150 - Math.random() * 150,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
        life: 900 + Math.random() * 900, maxLife: 1800,
        size: 3 + Math.random() * 4,
        color: cols[i % cols.length],
      });
    }
    this.addShake(12);
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

    // fond tunnel
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#0d1014');
    bg.addColorStop(0.7, '#141a26');
    bg.addColorStop(1, '#1a2230');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake * this.scale * 0.6;
      sy = (Math.random() - 0.5) * this.shake * this.scale * 0.6;
    }
    ctx.translate(this.offX + sx, this.offY + sy);
    ctx.scale(this.scale, this.scale);

    this.drawBackdrop(ctx, t);
    this.drawGround(ctx);
    this.drawSling(ctx);
    this.drawBodies(ctx);
    if (this.dragging && this.dragPos) this.drawAim(ctx);
    this.drawParticles(ctx);
    ctx.restore();
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, t: number) {
    const { level } = this;
    // silhouette de Paris 1789, néon discret
    ctx.strokeStyle = 'rgba(110,196,232,0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let x = 0;
    let seed = 7;
    ctx.moveTo(0, level.groundY - 110);
    while (x < level.worldW) {
      seed = (seed * 16807) % 2147483647;
      const w = 50 + (seed % 70);
      const h = 70 + (seed % 90);
      ctx.lineTo(x, level.groundY - h);
      ctx.lineTo(x + w, level.groundY - h);
      x += w;
    }
    ctx.lineTo(level.worldW, level.groundY);
    ctx.stroke();
    // lune néon
    ctx.beginPath();
    ctx.arc(level.worldW * 0.5, 90, 34, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(242,194,0,${0.25 + 0.08 * Math.sin(t * 0.001)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const { level } = this;
    ctx.fillStyle = '#10141a';
    ctx.fillRect(-100, level.groundY, level.worldW + 200, level.worldH - level.groundY + 100);
    ctx.strokeStyle = '#6ec4e8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#6ec4e8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-100, level.groundY);
    ctx.lineTo(level.worldW + 100, level.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawSling(ctx: CanvasRenderingContext2D) {
    const { slingX, slingY, groundY } = this.level;
    ctx.strokeStyle = '#8d5e2a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(slingX - 14, groundY);
    ctx.lineTo(slingX - 6, slingY + 6);
    ctx.moveTo(slingX + 14, groundY);
    ctx.lineTo(slingX + 6, slingY + 6);
    ctx.stroke();
    // élastique vers le boulet en attente
    if (this.ball && !this.ballInFlight) {
      ctx.strokeStyle = '#cf009e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(slingX - 8, slingY + 2);
      ctx.lineTo(this.ball.position.x, this.ball.position.y);
      ctx.lineTo(slingX + 8, slingY + 2);
      ctx.stroke();
    }
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

  private drawBodies(ctx: CanvasRenderingContext2D) {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (body.label === 'block') {
        const meta = this.blocks.get(body.id);
        if (!meta) continue;
        const mat = MATERIAL[meta.material];
        this.drawRect(ctx, body, mat.color, mat.edge);
        // fissures selon les dégâts
        if (meta.maxHp !== Infinity && meta.hp < meta.maxHp * 0.66) {
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);
          ctx.strokeStyle = 'rgba(13,16,20,0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-6, -8); ctx.lineTo(2, 0); ctx.lineTo(-3, 9);
          if (meta.hp < meta.maxHp * 0.33) { ctx.moveTo(8, -9); ctx.lineTo(4, 2); }
          ctx.stroke();
          ctx.restore();
        }
      } else if (body.label === 'target') {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.shadowColor = '#f2c200';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#f2c200';
        ctx.beginPath();
        ctx.arc(0, 0, body.circleRadius ?? 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0d1014';
        ctx.font = 'bold 15px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚜', 0, 1);
        ctx.restore();
      } else if (body.label === 'ball') {
        // traînée
        this.trail.push({ x: body.position.x, y: body.position.y });
        if (this.trail.length > 14) this.trail.shift();
        if (this.ballInFlight) {
          for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            ctx.fillStyle = `rgba(110,196,232,${(i / this.trail.length) * 0.35})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, BALL_R * (i / this.trail.length) * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.fillStyle = '#1d2530';
        ctx.strokeStyle = '#6ec4e8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#6ec4e8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawRect(ctx: CanvasRenderingContext2D, body: Matter.Body, fill: string, edge: string) {
    const v = body.vertices;
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
