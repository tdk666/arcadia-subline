import { describe, it, expect } from 'vitest';
import type { GameAnswers } from '@arcadia/games';
import { previewDemolitionScore } from './scoring';

/**
 * Filet de sécurité sur LA formule qui a cassé la prod deux fois (faux positif
 * de scoring). Ces tests verrouillent le contrat anti-triche + le succès/échec.
 * Si le moteur change la télémétrie, ces tests doivent rester verts (ou être
 * mis à jour sciemment) — jamais une régression silencieuse en prod.
 */

const bronze = { maxShots: 6, targetPct: 0 };
const gold = { maxShots: 4, targetPct: 40 };

/** Télémétrie d'une partie gagnée « propre » au palier Bronze. */
function cleanBronzeWin(over: Partial<GameAnswers> = {}): GameAnswers {
  return {
    tier: 'bronze',
    shots_used: 3,
    max_shots: 6,
    blocks_destroyed: 8,
    total_blocks: 23,
    destruction_pct: 35,
    targets_down: 3,
    total_targets: 3,
    time_left_ms: 0,
    ...over,
  };
}

describe('previewDemolitionScore — succès / échec', () => {
  it('valide une victoire bronze propre (3 étendards, pct ≥ 0)', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin(), 9000);
    expect(r.flagged).toBe(false);
    expect(r.success).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.mastery).toBeGreaterThan(0);
  });

  it('échec si tous les étendards ne sont pas tombés', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin({ targets_down: 2 }), 9000);
    expect(r.flagged).toBe(false);
    expect(r.success).toBe(false);
  });

  it('échec si le % de destruction requis (Or) n’est pas atteint', () => {
    const tel = cleanBronzeWin({ tier: 'gold', shots_used: 4, max_shots: 4, destruction_pct: 30, targets_down: 3 });
    const r = previewDemolitionScore(gold, 'gold', tel, 20000);
    expect(r.success).toBe(false); // 30 % < 40 % requis
  });

  it('valide une victoire Or quand pct ≥ requis', () => {
    const tel = cleanBronzeWin({ tier: 'gold', shots_used: 4, max_shots: 4, destruction_pct: 45, targets_down: 3, time_left_ms: 12000 });
    const r = previewDemolitionScore(gold, 'gold', tel, 25000);
    expect(r.flagged).toBe(false);
    expect(r.success).toBe(true);
  });
});

describe('previewDemolitionScore — contrat anti-triche (le bug de prod)', () => {
  it('NE signale PAS une victoire légitime (régression du faux positif)', () => {
    // exactement le cas qui bloquait Bronze : victoire propre, pct dans [0,100]
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin({ destruction_pct: 100 }), 9000);
    expect(r.flagged).toBe(false);
    expect(r.success).toBe(true);
  });

  it('signale un pct > 100 (impossible → triche/bug)', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin({ destruction_pct: 122 }), 9000);
    expect(r.flagged).toBe(true);
    expect(r.score).toBe(0);
  });

  it('signale plus de tirs que le maximum du palier', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin({ shots_used: 7 }), 9000);
    expect(r.flagged).toBe(true);
  });

  it('signale une partie trop rapide (durée < shots × 800 ms)', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin({ shots_used: 3 }), 1000);
    expect(r.flagged).toBe(true);
  });

  it('signale un pct négatif', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin({ destruction_pct: -5 }), 9000);
    expect(r.flagged).toBe(true);
  });
});

describe('previewDemolitionScore — XP = marge de progression', () => {
  it('xpGained = score quand aucun meilleur précédent', () => {
    const r = previewDemolitionScore(bronze, 'bronze', cleanBronzeWin(), 9000);
    expect(r.xpGained).toBe(r.score);
  });

  it('xpGained = 0 quand on n’améliore pas son meilleur', () => {
    const tel = cleanBronzeWin();
    const first = previewDemolitionScore(bronze, 'bronze', tel, 9000);
    const again = previewDemolitionScore(bronze, 'bronze', tel, 9000, first.score);
    expect(again.xpGained).toBe(0);
  });

  it('le palier Or rapporte plus que le Bronze à performance égale (multiplicateur)', () => {
    const telB = cleanBronzeWin({ destruction_pct: 50 });
    const telG = cleanBronzeWin({ tier: 'gold', shots_used: 4, max_shots: 4, destruction_pct: 50, targets_down: 3 });
    const rB = previewDemolitionScore({ maxShots: 6, targetPct: 0 }, 'bronze', telB, 12000);
    const rG = previewDemolitionScore({ maxShots: 4, targetPct: 40 }, 'gold', telG, 12000);
    expect(rG.score).toBeGreaterThan(rB.score);
  });
});
