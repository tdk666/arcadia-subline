/**
 * Passerelle backend : UNE interface, deux implémentations.
 *   · SupabaseBackend — la vraie : auth + RPC fn_submit_attempt + check_ins.
 *   · DemoBackend — sans clés : tout est simulé localement, l'app reste 100 %
 *     jouable (footprint Chromebook, démos, revues de design).
 * INVARIANT : le score vient TOUJOURS de submitAttempt — l'UI n'en calcule jamais.
 */

export interface AttemptResult {
  attemptId: string | null;
  score: number;
  success: boolean;
  xpGained: number;
  mastery: number;
  flagged: boolean;
  /** Banque V2 : points cumulés vers le seuil (null = quête non-banque). */
  pointsTotal?: number | null;
  /** Banque V2 : seuil de points du palier (null = quête non-banque). */
  pointsThreshold?: number | null;
}

/** Progression banque V2 par quête (lecture). Seuils/déblocage = autorité serveur. */
export interface QuestProgress {
  questId: string;
  pointsTotal: number;
  pointsThreshold: number | null;
  passedStepIds: string[];
  unlocked: boolean;
}

export type CheckInError = 'cooldown' | 'auth_required' | 'error';

export interface CheckInResult {
  ok: boolean;
  error?: CheckInError;
  /** Fin de validité du check-in (TTL serveur, 10 min). */
  expiresAt?: string;
  /** Secondes restantes avant la fin du cooldown (si error = cooldown). */
  cooldownS?: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  rank: number;
  score: number;
  isMe: boolean;
}

export interface BackendUser {
  id: string;
  email?: string;
  displayName: string;
}

export interface StationProgress {
  state: 'discovered' | 'visited' | 'mastered';
  masteryScore: number;
}

export interface ArcadiaBackend {
  readonly mode: 'supabase' | 'demo';

  getUser(): Promise<BackendUser | null>;
  onAuthChange(cb: (user: BackendUser | null) => void): () => void;
  signUp(email: string, password: string, displayName: string): Promise<{ error?: string; needsConfirm?: boolean }>;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;

  /** SEULE porte d'entrée du score (RPC fn_submit_attempt côté Supabase). */
  submitAttempt(questId: string, answers: Record<string, unknown>, durationMs: number): Promise<AttemptResult>;
  checkIn(stationId: string, method: 'manual'): Promise<CheckInResult>;
  getActiveCheckIn(stationId: string): Promise<{ expiresAt: string } | null>;
  getLineLeaderboard(lineId: string): Promise<LeaderboardEntry[]>;
  /** Classement PAR STATION (titre « Chef de Station ») : meilleur score/joueur. */
  getStationLeaderboard(stationId: string): Promise<LeaderboardEntry[]>;
  getMyStationProgress(stationId: string): Promise<StationProgress | null>;
  getMyStats(): Promise<{ xpTotal: number; streak: number } | null>;
  /** Banque V2 : progression par quête (points cumulés, items réussis, déblocage). */
  getQuestProgress(questIds: string[]): Promise<QuestProgress[]>;
  /** Sink télémétrie (events). Non bloquant, best-effort, jamais d'await UI. */
  logEvents(batch: { name: string; props: Record<string, unknown>; clientTs: number }[]): Promise<void>;
}
