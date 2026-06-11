/**
 * Backend DÉMO : aucune clé Supabase requise, tout vit dans localStorage.
 * Reproduit les règles serveur (formule de score 0012, cooldown 90 s, TTL
 * 10 min, mastered = visited + mastery ≥ 80, XP = marge de progression) pour
 * que le passage en mode réel ne change RIEN au ressenti.
 * L'UI affiche en permanence le bandeau "mode démo" — aucun score n'est réel.
 */
import type { DifficultyTier, GameAnswers } from '@arcadia/games';
import { getStationContent, LINE } from '../content';
import { previewDemolitionScore } from '../scoring';
import type {
  ArcadiaBackend, AttemptResult, BackendUser, CheckInResult, LeaderboardEntry, StationProgress,
} from './types';

const KEY = 'arcadia.demo.v1';
const COOLDOWN_S = 90;
const TTL_MIN = 10;

interface DemoState {
  user: BackendUser | null;
  xpTotal: number;
  streak: number;
  bestScores: Record<string, number>; // questId → meilleur score
  stations: Record<string, StationProgress>;
  checkIns: { stationId: string; createdAt: number; expiresAt: number }[];
}

function fresh(): DemoState {
  return { user: null, xpTotal: 0, streak: 0, bestScores: {}, stations: {}, checkIns: [] };
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

  /** Réplique fidèle de la formule serveur (migration 0012) — démo uniquement. */
  async submitAttempt(questId: string, answers: Record<string, unknown>, durationMs: number): Promise<AttemptResult> {
    const station = LINE.stations.map((s) => getStationContent(s.slug)).find(
      (c) => c && Object.values(c.quests).some((q) => q.questId === questId),
    );
    const tier = (Object.entries(station?.quests ?? {}).find(([, q]) => q.questId === questId)?.[0] ?? 'bronze') as DifficultyTier;
    const params = station?.quests[tier]?.params ?? {};
    const tel = (Object.values(answers)[0] ?? {}) as GameAnswers;

    const best = this.state.bestScores[questId] ?? 0;
    const result = previewDemolitionScore(params, tier, tel, durationMs, best);
    const { score, success, xpGained, mastery, flagged } = result;

    if (!flagged) {
      this.state.bestScores[questId] = Math.max(best, score);
      this.state.xpTotal += xpGained;
      this.state.streak = Math.max(1, this.state.streak);
      if (station) {
        const prev = this.state.stations[station.stationId];
        const masteryScore = Math.max(prev?.masteryScore ?? 0, mastery);
        const visited = prev?.state === 'visited' || prev?.state === 'mastered';
        this.state.stations[station.stationId] = {
          masteryScore,
          state: visited && masteryScore >= 80 ? 'mastered' : visited ? 'visited' : 'discovered',
        };
      }
      this.save();
    }

    return { attemptId: null, score, success, xpGained, mastery, flagged };
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
    if (this.state.user && myScore > 0) {
      all.push({ displayName: this.state.user.displayName, score: myScore, isMe: true, playerId: 'demo-user' });
    }
    return all
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async getMyStationProgress(stationId: string) {
    return this.state.stations[stationId] ?? null;
  }

  async getMyStats() {
    return { xpTotal: this.state.xpTotal, streak: this.state.streak };
  }
}
