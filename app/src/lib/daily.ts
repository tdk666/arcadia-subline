/**
 * COUCHE D'HABITUDE QUOTIDIENNE — la mécanique de streak (leçon Duolingo : churn
 * 47 %→28 %). Pure et locale (marche en démo comme en Supabase) ; le serveur
 * tient déjà un streak de stats, mais l'habitude VISIBLE (flamme, objectif du
 * jour, aversion à la perte) se pilote ici, au plus près du joueur.
 *
 * Modèle : on ne mute QUE sur une victoire (advanceDaily). L'affichage applique
 * le passage de jour en lecture (liveStreak/todayProgress/doneToday) — donc
 * ouvrir l'app le lendemain montre la flamme « en danger » sans rien muter.
 */
export interface DailyState {
  /** Nombre de victoires à faire pour valider la journée. */
  goal: number;
  /** Jour (YYYY-MM-DD local) auquel `progress` se rapporte. */
  progressDay: string;
  /** Victoires accumulées ce jour. */
  progress: number;
  /** Dernier jour où l'objectif a été atteint (null = jamais). */
  lastCompletedDay: string | null;
  /** Jours consécutifs validés (la « série »). */
  streak: number;
  /** Une récompense de série est à célébrer (consommée par l'UI). */
  rewardPending: boolean;
}

export const INITIAL_DAILY: DailyState = {
  goal: 1,
  progressDay: '',
  progress: 0,
  lastCompletedDay: null,
  streak: 0,
  rewardPending: false,
};

/** Date locale au format YYYY-MM-DD (jour « calendaire » du joueur). */
export function dayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Avance la couche quotidienne d'UNE victoire propre. */
export function advanceDaily(prev: DailyState): DailyState {
  const today = dayStr();
  const yesterday = dayStr(new Date(Date.now() - 86_400_000));
  let progress = prev.progressDay === today ? prev.progress : 0;
  let { streak, lastCompletedDay, rewardPending } = prev;
  progress += 1;
  if (progress >= prev.goal && lastCompletedDay !== today) {
    streak = lastCompletedDay === yesterday ? streak + 1 : 1; // continuité ou reprise
    lastCompletedDay = today;
    rewardPending = true;
  }
  return { ...prev, progress, progressDay: today, streak, lastCompletedDay, rewardPending };
}

/** Série VIVANTE (0 si un jour a été manqué → aversion à la perte affichée). */
export function liveStreak(p: DailyState): number {
  const today = dayStr();
  const yesterday = dayStr(new Date(Date.now() - 86_400_000));
  return p.lastCompletedDay === today || p.lastCompletedDay === yesterday ? p.streak : 0;
}

/** Progression du jour (0 si le dernier progrès date d'un autre jour). */
export function todayProgress(p: DailyState): number {
  return p.progressDay === dayStr() ? p.progress : 0;
}

/** L'objectif du jour est-il déjà atteint aujourd'hui ? */
export function doneToday(p: DailyState): boolean {
  return p.lastCompletedDay === dayStr();
}
