import { describe, it, expect } from 'vitest';
import { advanceDaily, dayStr, doneToday, INITIAL_DAILY, liveStreak, todayProgress } from './daily';

/**
 * La couche d'habitude (streak) pilote la rétention — ses cas limites
 * (continuité / reprise / perte) doivent rester verrouillés.
 */
const today = dayStr();
const yesterday = dayStr(new Date(Date.now() - 86_400_000));
const old = dayStr(new Date(Date.now() - 3 * 86_400_000));

describe('daily / streak', () => {
  it('1re victoire valide le jour et démarre la série', () => {
    const d = advanceDaily(INITIAL_DAILY); // goal 1
    expect(doneToday(d)).toBe(true);
    expect(d.streak).toBe(1);
    expect(d.rewardPending).toBe(true);
  });

  it('objectif goal=2 : une victoire ne valide pas, deux valident', () => {
    const one = advanceDaily({ ...INITIAL_DAILY, goal: 2 });
    expect(doneToday(one)).toBe(false);
    expect(one.streak).toBe(0);
    expect(todayProgress(one)).toBe(1);
    const two = advanceDaily(one);
    expect(doneToday(two)).toBe(true);
    expect(two.streak).toBe(1);
  });

  it('la série continue si hier était validé', () => {
    const d = advanceDaily({ ...INITIAL_DAILY, lastCompletedDay: yesterday, streak: 5 });
    expect(d.streak).toBe(6);
  });

  it('la série repart à 1 si un jour a été manqué', () => {
    const d = advanceDaily({ ...INITIAL_DAILY, lastCompletedDay: old, streak: 5 });
    expect(d.streak).toBe(1);
  });

  it('liveStreak tombe à 0 quand la dernière complétion est trop ancienne', () => {
    expect(liveStreak({ ...INITIAL_DAILY, lastCompletedDay: today, streak: 3 })).toBe(3);
    expect(liveStreak({ ...INITIAL_DAILY, lastCompletedDay: yesterday, streak: 3 })).toBe(3);
    expect(liveStreak({ ...INITIAL_DAILY, lastCompletedDay: old, streak: 3 })).toBe(0);
  });

  it('rejouer le même jour ne regonfle pas la série', () => {
    const first = advanceDaily(INITIAL_DAILY);
    const again = advanceDaily(first);
    expect(again.streak).toBe(1);
    expect(todayProgress(again)).toBe(2);
  });
});
