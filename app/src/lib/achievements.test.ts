import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, unlockedAchievements, type AchievementSnapshot } from './achievements';

const EMPTY: AchievementSnapshot = {
  stationsConquered: 0, goldCount: 0, totalTiers: 0,
  archivesUnlocked: 0, streak: 0, coins: 0, playableTotal: 2,
};

describe('achievements', () => {
  it('unlocks nothing at zero progress', () => {
    expect(unlockedAchievements(EMPTY)).toEqual([]);
  });

  it('unlocks first conquest on the first station', () => {
    expect(unlockedAchievements({ ...EMPTY, stationsConquered: 1 })).toContain('premiere_pierre');
  });

  it('gates the streak tiers correctly', () => {
    expect(unlockedAchievements({ ...EMPTY, streak: 3 })).toContain('serie_3');
    expect(unlockedAchievements({ ...EMPTY, streak: 3 })).not.toContain('serie_7');
    expect(unlockedAchievements({ ...EMPTY, streak: 7 })).toEqual(
      expect.arrayContaining(['serie_3', 'serie_7']),
    );
  });

  it('unlocks line conqueror only when all playable stations are done', () => {
    expect(unlockedAchievements({ ...EMPTY, stationsConquered: 1, playableTotal: 2 })).not.toContain('conquerant');
    expect(unlockedAchievements({ ...EMPTY, stationsConquered: 2, playableTotal: 2 })).toContain('conquerant');
  });

  it('never marks conqueror when nothing is playable', () => {
    expect(unlockedAchievements({ ...EMPTY, stationsConquered: 0, playableTotal: 0 })).not.toContain('conquerant');
  });

  it('every catalogue entry has a matching i18n-friendly id and icon', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toMatch(/^[a-z0-9_]+$/);
      expect(a.icon.length).toBeGreaterThan(0);
    }
  });
});
