import { describe, expect, it } from 'vitest';
import type { DifficultyTier } from '@arcadia/games';
import { challengeOfDay, nextTierFor } from './challenge';

type Won = Record<string, DifficultyTier[]>;

const PLAYABLE = [
  { slug: 'louvre-rivoli', name: 'Louvre-Rivoli' },
  { slug: 'bastille', name: 'Bastille' },
];

describe('nextTierFor', () => {
  it('returns bronze when nothing is won', () => {
    expect(nextTierFor('x', {})).toEqual({ tier: 'bronze', isReplay: false });
  });
  it('returns the first not-won tier (always unlocked by gating)', () => {
    expect(nextTierFor('x', { x: ['bronze'] })).toEqual({ tier: 'silver', isReplay: false });
    expect(nextTierFor('x', { x: ['bronze', 'silver'] })).toEqual({ tier: 'gold', isReplay: false });
  });
  it('flags replay (gold) when the station is fully conquered', () => {
    expect(nextTierFor('x', { x: ['bronze', 'silver', 'gold'] })).toEqual({ tier: 'gold', isReplay: true });
  });
});

describe('challengeOfDay', () => {
  it('returns null with no playable stations', () => {
    expect(challengeOfDay([], {})).toBeNull();
  });

  it('is deterministic for a given day', () => {
    const a = challengeOfDay(PLAYABLE, {}, '2026-06-23');
    const b = challengeOfDay(PLAYABLE, {}, '2026-06-23');
    expect(a).toEqual(b);
  });

  it('always targets a fresh (non-replay) challenge while one exists', () => {
    // louvre fully done, bastille fresh → must pick bastille across many days
    const tiersWon: Won = { 'louvre-rivoli': ['bronze', 'silver', 'gold'] };
    for (const day of ['2026-06-23', '2026-06-24', '2026-06-25', '2026-07-01']) {
      const c = challengeOfDay(PLAYABLE, tiersWon, day);
      expect(c?.slug).toBe('bastille');
      expect(c?.isReplay).toBe(false);
    }
  });

  it('falls back to replay only when everything is conquered', () => {
    const tiersWon: Won = {
      'louvre-rivoli': ['bronze', 'silver', 'gold'],
      bastille: ['bronze', 'silver', 'gold'],
    };
    const c = challengeOfDay(PLAYABLE, tiersWon, '2026-06-23');
    expect(c?.isReplay).toBe(true);
    expect(c?.tier).toBe('gold');
  });

  it('rotates between fresh stations across days', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const day = `2026-06-${String(d).padStart(2, '0')}`;
      const c = challengeOfDay(PLAYABLE, {}, day);
      if (c) seen.add(c.slug);
    }
    expect(seen.size).toBeGreaterThan(1); // les deux stations apparaissent
  });
});
