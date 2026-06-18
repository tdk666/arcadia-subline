import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TIER_ORDER, type DifficultyTier, type GameAnswers } from '@arcadia/games';
import { backend, type AttemptResult, type BackendUser } from '../lib/backend';
import { advanceDaily, INITIAL_DAILY, type DailyState } from '../lib/daily';

/** Tentative gagnée en invité, à rejouer côté serveur après création du compte. */
export interface PendingAttempt {
  questId: string;
  slug: string;
  tier: DifficultyTier;
  answers: Record<string, GameAnswers>;
  durationMs: number;
}

export interface LastResult extends AttemptResult {
  slug: string;
  tier: DifficultyTier;
  /** true = aperçu local (invité/démo non connecté), pas un score serveur. */
  localOnly: boolean;
}

interface ArcadiaState {
  user: BackendUser | null;
  setUser: (u: BackendUser | null) => void;

  /** Progression locale (invité + cache optimiste). slug → paliers gagnés. */
  tiersWon: Record<string, DifficultyTier[]>;
  mastery: Record<string, number>;
  storyUnlocked: Record<string, boolean>;
  localBest: Record<string, number>; // questId → meilleur score vu
  pending: PendingAttempt[];
  lastResult: LastResult | null;
  /** Couche d'habitude quotidienne (streak / objectif du jour). */
  daily: DailyState;
  /** Jetons — monnaie gagnée en jouant (substrat de la future boutique). */
  coins: number;

  recordResult: (r: LastResult) => void;
  queuePending: (p: PendingAttempt) => void;
  /** Consomme la récompense de série après l'avoir célébrée. */
  clearDailyReward: () => void;
  /** Rejoue les tentatives invitées via fn_submit_attempt (post-signup). */
  flushPending: () => Promise<void>;
  highestTierWon: (slug: string) => DifficultyTier | null;
  isTierUnlocked: (slug: string, tier: DifficultyTier) => boolean;
}

export const useArcadia = create<ArcadiaState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => {
        set({ user });
        if (user) void get().flushPending();
      },

      tiersWon: {},
      mastery: {},
      storyUnlocked: {},
      localBest: {},
      pending: [],
      lastResult: null,
      daily: INITIAL_DAILY,
      coins: 0,

      recordResult: (r) => {
        set((s) => {
          const next: Partial<ArcadiaState> = { lastResult: r };
          if (r.success && !r.flagged) {
            const won = new Set(s.tiersWon[r.slug] ?? []);
            won.add(r.tier);
            next.tiersWon = { ...s.tiersWon, [r.slug]: TIER_ORDER.filter((t) => won.has(t)) };
            next.mastery = { ...s.mastery, [r.slug]: Math.max(s.mastery[r.slug] ?? 0, r.mastery) };
            next.storyUnlocked = { ...s.storyUnlocked, [r.slug]: true };
            // une victoire propre fait avancer l'objectif du jour / la série
            next.daily = advanceDaily(s.daily);
            // jetons gagnés selon le palier (récompense immédiate + substrat boutique)
            next.coins = s.coins + ({ bronze: 10, silver: 20, gold: 30 } as const)[r.tier];
          }
          return next;
        });
      },

      clearDailyReward: () => set((s) => ({ daily: { ...s.daily, rewardPending: false } })),

      queuePending: (p) => {
        set((s) => ({
          // une seule tentative en file par quête : on garde la dernière
          pending: [...s.pending.filter((x) => x.questId !== p.questId), p],
          localBest: { ...s.localBest },
        }));
      },

      flushPending: async () => {
        const { pending } = get();
        if (backend.mode !== 'supabase' || pending.length === 0) return;
        const remaining: PendingAttempt[] = [];
        // l'ordre compte : bronze avant argent avant or (gating serveur)
        const sorted = [...pending].sort(
          (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
        );
        for (const p of sorted) {
          try {
            const r = await backend.submitAttempt(p.questId, p.answers, p.durationMs);
            get().recordResult({ ...r, slug: p.slug, tier: p.tier, localOnly: false });
          } catch (e) {
            console.warn('flushPending:', e);
            remaining.push(p);
          }
        }
        set({ pending: remaining });
      },

      highestTierWon: (slug) => {
        const won = get().tiersWon[slug] ?? [];
        return won.length ? won[won.length - 1] : null;
      },

      isTierUnlocked: (slug, tier) => {
        const idx = TIER_ORDER.indexOf(tier);
        if (idx === 0) return true;
        return (get().tiersWon[slug] ?? []).includes(TIER_ORDER[idx - 1]);
      },
    }),
    {
      name: 'arcadia.player.v1',
      partialize: (s) => ({
        tiersWon: s.tiersWon,
        mastery: s.mastery,
        storyUnlocked: s.storyUnlocked,
        localBest: s.localBest,
        pending: s.pending,
        daily: s.daily,
        coins: s.coins,
      }),
    },
  ),
);
