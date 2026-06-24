/**
 * Backend DÉMO : aucune clé Supabase requise, tout vit dans localStorage.
 * Reproduit les règles serveur (formule de score 0012, cooldown 90 s, TTL
 * 10 min, mastered = visited + mastery ≥ 80, XP = marge de progression) pour
 * que le passage en mode réel ne change RIEN au ressenti.
 * L'UI affiche en permanence le bandeau "mode démo" — aucun score n'est réel.
 */
import type { DifficultyTier, GameAnswers, QuizQuestion } from '@arcadia/games';
import { getStationContent, isBankedQuiz, LINE, tierThreshold, type StationContent } from '../content';
import { previewBankedQuizScore, previewDemolitionScore } from '../scoring';
import type {
  ArcadiaBackend, AttemptResult, BackendUser, CheckInResult, LeaderboardEntry, QuestProgress, StationProgress,
} from './types';

const KEY = 'arcadia.demo.v1';
const COOLDOWN_S = 90;
const TTL_MIN = 10;

interface BankProgress { pointsTotal: number; passed: string[] }

interface DemoState {
  user: BackendUser | null;
  xpTotal: number;
  streak: number;
  bestScores: Record<string, number>; // questId → meilleur score
  stations: Record<string, StationProgress>;
  checkIns: { stationId: string; createdAt: number; expiresAt: number }[];
  // Banque V2 : progression cumulée par questId (points + items réussis).
  questProgress: Record<string, BankProgress>;
}

function fresh(): DemoState {
  return { user: null, xpTotal: 0, streak: 0, bestScores: {}, stations: {}, checkIns: [], questProgress: {} };
}

/** Retrouve le contenu de station + le palier d'une quête (par questId). */
function locate(questId: string): { content: StationContent; tier: DifficultyTier } | null {
  for (const s of LINE.stations) {
    const c = getStationContent(s.slug);
    if (!c) continue;
    const entry = Object.entries(c.quests).find(([, q]) => q.questId === questId);
    if (entry) return { content: c, tier: entry[0] as DifficultyTier };
  }
  return null;
}

export class DemoBackend implements ArcadiaBackend {
  readonly mode = 'demo' as const;
  private state: DemoState;
  private listeners = new Set<(u: BackendUser | null) => void>();

  constructor() {
    try {
      this.state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
    } catch {
      this.state = fresh();
    }
  }

  private save() {
    localStorage.setItem(KEY, JSON.stringify(this.state));
  }

  async getUser() {
    return this.state.user;
  }

  onAuthChange(cb: (u: BackendUser | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb(this.state.user);
  }

  async signUp(email: string, _password: string, displayName: string) {
    this.state.user = { id: 'demo-user', email, displayName };
    this.save();
    this.emit();
    return {};
  }

  async signIn(email: string, _password: string) {
    this.state.user = { id: 'demo-user', email, displayName: email.split('@')[0] };
    this.save();
    this.emit();
    return {};
  }

  async signOut() {
    this.state.user = null;
    this.save();
    this.emit();
  }

  /** Met à jour la maîtrise de station (mêmes règles que le serveur). */
  private bumpStation(content: StationContent, mastery: number) {
    const prev = this.state.stations[content.stationId];
    const masteryScore = Math.max(prev?.masteryScore ?? 0, mastery);
    const visited = prev?.state === 'visited' || prev?.state === 'mastered';
    this.state.stations[content.stationId] = {
      masteryScore,
      state: visited && masteryScore >= 80 ? 'mastered' : visited ? 'visited' : 'discovered',
    };
  }

  /** Présence requise (DEC-015) : un check-in actif (non expiré) sur la station rend
   *  la partie « officielle ». Sans présence, on joue en ENTRAÎNEMENT (non comptabilisé). */
  private hasActiveCheckIn(stationId: string): boolean {
    const now = Date.now();
    return this.state.checkIns.some((c) => c.stationId === stationId && c.expiresAt > now);
  }

  /** Réplique fidèle des formules serveur (0012 démolition / 0016 banque) — démo. */
  async submitAttempt(questId: string, answers: Record<string, unknown>, durationMs: number): Promise<AttemptResult> {
    const loc = locate(questId);
    const station = loc?.content;
    const tier = loc?.tier ?? 'bronze';
    const params = station?.quests[tier]?.params ?? {};
    // présence validée ? (si station introuvable : on ne pénalise pas → compté)
    const scored = station ? this.hasActiveCheckIn(station.stationId) : true;

    // ── Quiz BANQUE V2 : cumul vers le seuil, jamais re-créditer un item réussi ──
    if (station && station.game.archetype === 'quiz' && isBankedQuiz(station)) {
      const questions = (params.questions as QuizQuestion[]) ?? [];
      const threshold = tierThreshold(station, tier);
      const prog = this.state.questProgress[questId] ?? { pointsTotal: 0, passed: [] };
      const r = previewBankedQuizScore(
        questions, tier, answers as GameAnswers, durationMs, threshold, prog.pointsTotal, prog.passed,
      );
      // ENTRAÎNEMENT (pas de présence) : on calcule le score pour le retour, mais on
      // ne persiste RIEN (ni progression, ni XP, ni maîtrise) et le seuil n'avance pas.
      if (!r.flagged && scored) {
        this.state.questProgress[questId] = {
          pointsTotal: r.pointsTotal,
          passed: Array.from(new Set([...prog.passed, ...r.newPassed])),
        };
        this.state.xpTotal += r.xpGained;
        this.state.streak = Math.max(1, this.state.streak);
        this.bumpStation(station, r.mastery);
        this.save();
      }
      return {
        attemptId: null, score: r.score, success: r.success, xpGained: scored ? r.xpGained : 0,
        mastery: r.mastery, flagged: r.flagged,
        pointsTotal: scored ? r.pointsTotal : prog.pointsTotal, pointsThreshold: threshold, scored,
      };
    }

    // ── Démolition (0012) : p_answers = { "<step_id>": télémétrie } ──
    const best = this.state.bestScores[questId] ?? 0;
    const { score, success, xpGained, mastery, flagged } =
      previewDemolitionScore(params, tier, (Object.values(answers)[0] ?? {}) as GameAnswers, durationMs, best);

    // ENTRAÎNEMENT (pas de présence) : score affiché pour le retour, mais rien n'est
    // persisté (ni meilleur score, ni XP, ni maîtrise) → pas de conquête sans présence.
    if (!flagged && scored) {
      this.state.bestScores[questId] = Math.max(best, score);
      this.state.xpTotal += xpGained;
      this.state.streak = Math.max(1, this.state.streak);
      if (station) this.bumpStation(station, mastery);
      this.save();
    }

    return { attemptId: null, score, success, xpGained: scored ? xpGained : 0, mastery, flagged, scored };
  }

  async getQuestProgress(questIds: string[]): Promise<QuestProgress[]> {
    return questIds.map((qid) => {
      const loc = locate(qid);
      const prog = this.state.questProgress[qid] ?? { pointsTotal: 0, passed: [] };
      if (!loc) {
        return { questId: qid, pointsTotal: prog.pointsTotal, pointsThreshold: null, passedStepIds: prog.passed, unlocked: true };
      }
      const { content, tier } = loc;
      const threshold = tierThreshold(content, tier);
      let unlocked = true;
      if (tier !== 'bronze') {
        const prevTier: DifficultyTier = tier === 'silver' ? 'bronze' : 'silver';
        const prevId = content.quests[prevTier].questId;
        const prevPoints = this.state.questProgress[prevId]?.pointsTotal ?? 0;
        const prevThresh = tierThreshold(content, prevTier);
        unlocked = prevThresh > 0 && prevPoints >= prevThresh;
      }
      return { questId: qid, pointsTotal: prog.pointsTotal, pointsThreshold: threshold || null, passedStepIds: prog.passed, unlocked };
    });
  }

  async checkIn(stationId: string, _method: 'manual'): Promise<CheckInResult> {
    if (!this.state.user) return { ok: false, error: 'auth_required' };
    const now = Date.now();
    const last = [...this.state.checkIns].sort((a, b) => b.createdAt - a.createdAt)[0];
    if (last && last.stationId !== stationId && now - last.createdAt < COOLDOWN_S * 1000) {
      return { ok: false, error: 'cooldown', cooldownS: Math.ceil((COOLDOWN_S * 1000 - (now - last.createdAt)) / 1000) };
    }
    const expiresAt = now + TTL_MIN * 60_000;
    this.state.checkIns.push({ stationId, createdAt: now, expiresAt });
    const prev = this.state.stations[stationId];
    const masteryScore = prev?.masteryScore ?? 0;
    this.state.stations[stationId] = {
      masteryScore,
      state: masteryScore >= 80 ? 'mastered' : 'visited',
    };
    this.save();
    return { ok: true, expiresAt: new Date(expiresAt).toISOString() };
  }

  async getActiveCheckIn(stationId: string) {
    const hit = this.state.checkIns.find((c) => c.stationId === stationId && c.expiresAt > Date.now());
    return hit ? { expiresAt: new Date(hit.expiresAt).toISOString() } : null;
  }

  async getLineLeaderboard(_lineId: string): Promise<LeaderboardEntry[]> {
    const rivals = [
      { displayName: 'MaestroM1', score: 2140 },
      { displayName: 'ReineDeBastille', score: 1875 },
      { displayName: 'TunnelRunner', score: 1430 },
      { displayName: 'Guimard1900', score: 1210 },
      { displayName: 'PendulaireX', score: 860 },
      { displayName: 'QuaiNuit', score: 540 },
    ];
    const myScore = Object.values(this.state.bestScores).reduce((a, b) => a + b, 0);
    const all = [...rivals.map((r) => ({ ...r, isMe: false, playerId: r.displayName }))];
    // scores connectés : l'invité apparaît AUSSI dès qu'il a un score (la boucle
    // jeu → score → rang se ferme sans attendre un compte ; guest-first).
    if (myScore > 0) {
      all.push({ displayName: this.state.user?.displayName ?? 'Toi', score: myScore, isMe: true, playerId: 'demo-user' });
    }
    return all
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
    // Classement général « tout Paris » : rivaux prestige (XP total) + TOI dès que
    // tu as joué. Le live (Supabase) lit la matview leaderboard_entries scope=global.
    const rivals = [
      { displayName: 'EmpereurDesQuais', score: 18420 },
      { displayName: 'MaestroM1', score: 14210 },
      { displayName: 'ReineDeBastille', score: 12880 },
      { displayName: 'BaronDuMarais', score: 9650 },
      { displayName: 'Guimard1900', score: 7340 },
      { displayName: 'TunnelRunner', score: 5120 },
      { displayName: 'PendulaireX', score: 3460 },
      { displayName: 'QuaiNuit', score: 1980 },
    ];
    const all = rivals.map((r) => ({ ...r, isMe: false, playerId: r.displayName }));
    if (this.state.xpTotal > 0) {
      all.push({ displayName: this.state.user?.displayName ?? 'Toi', score: this.state.xpTotal, isMe: true, playerId: 'demo-user' });
    }
    return all.sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async getStationLeaderboard(stationId: string): Promise<LeaderboardEntry[]> {
    // démo : rivaux déterministes PAR station (mêmes pour une station donnée) + TOI
    // dès que tu as un score. Le live (Supabase) lira fn_station_leaderboard.
    const NAMES = ['MaîtreDuQuai', 'CitoyenneM', 'TribunDuMarais', 'Guimard1900', 'ReineDeNuit', 'Sans-culotte89', 'PendulaireX'];
    let seed = 0;
    for (let i = 0; i < stationId.length; i++) seed = (seed * 31 + stationId.charCodeAt(i)) | 0;
    seed = Math.abs(seed);
    const rivals = NAMES.slice(0, 5 + (seed % 3)).map((displayName, i) => ({
      displayName, playerId: `npc-${i}-${displayName}`, isMe: false,
      score: 420 + ((seed >> (i + 1)) % 900) + i * 25,
    }));
    const myScore = Object.values(this.state.bestScores).reduce((m, v) => Math.max(m, v), 0);
    const all = rivals.slice();
    if (myScore > 0) {
      all.push({ displayName: this.state.user?.displayName ?? 'Toi', playerId: 'demo-user', isMe: true, score: myScore });
    }
    return all.sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async getMyStationProgress(stationId: string) {
    return this.state.stations[stationId] ?? null;
  }

  async getMyStats() {
    return { xpTotal: this.state.xpTotal, streak: this.state.streak };
  }

  // Mode démo : pas de sink serveur (l'app reste 100 % jouable hors-ligne).
  async logEvents() {
    /* no-op */
  }
}
