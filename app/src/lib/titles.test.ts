import { describe, it, expect } from 'vitest';
import {
  buildScopes, rankScope, sumBest, titleHolder,
  type StationBest, type StationMembership,
} from './titles';

// 4 stations : 2 sur M1 / 2 sur M4 ; rives + arrondissements variés
const MEMBERS: StationMembership[] = [
  { slug: 'louvre-rivoli', lines: ['M1'], arrondissement: 1, rive: 'droite', quartier: 'louvre' },
  { slug: 'bastille', lines: ['M1', 'M5'], arrondissement: 4, rive: 'droite', quartier: 'le-marais' },
  { slug: 'odeon', lines: ['M4'], arrondissement: 6, rive: 'gauche', quartier: 'quartier-latin' },
  { slug: 'cite', lines: ['M4'], arrondissement: 4, rive: 'droite' },
];

const BEST: StationBest = {
  alice: { 'louvre-rivoli': 100, bastille: 50 },          // M1 = 150, rive droite = 150
  bob: { bastille: 90, odeon: 80, cite: 70 },             // rive droite = 160, gauche = 80
  carol: { 'louvre-rivoli': 40 },
};

describe('sumBest', () => {
  it('somme les meilleurs scores sur un ensemble de stations', () => {
    expect(sumBest(BEST.alice, ['louvre-rivoli', 'bastille'])).toBe(150);
    expect(sumBest(BEST.bob, ['louvre-rivoli'])).toBe(0); // bob n'y a pas joué
    expect(sumBest(undefined, ['x'])).toBe(0);
  });
});

describe('titleHolder — couronne par périmètre', () => {
  it('Chef de Station = meilleur score sur la station', () => {
    expect(titleHolder(BEST, ['louvre-rivoli'])?.playerId).toBe('alice'); // 100 > 40
    expect(titleHolder(BEST, ['bastille'])?.playerId).toBe('bob');         // bob 90 > alice 50
  });
  it('départage par largeur (stations tenues) puis id', () => {
    const best: StationBest = { a: { s1: 50 }, b: { s1: 30, s2: 20 } }; // Σ égales = 50
    const h = titleHolder(best, ['s1', 's2']);
    expect(h?.playerId).toBe('b'); // b tient 2 stations, a en tient 1
  });
  it('personne → null', () => {
    expect(titleHolder(BEST, ['inconnue'])).toBeNull();
  });
});

describe('agrégation des scopes supérieurs', () => {
  it('Bastille : bob (90) coiffe alice (50)', () => {
    expect(titleHolder(BEST, ['bastille'])?.playerId).toBe('bob');
  });
  it('Roi de la M1 (louvre+bastille) : alice 150 > bob 90', () => {
    const m1 = ['louvre-rivoli', 'bastille'];
    expect(titleHolder(BEST, m1)?.playerId).toBe('alice');
  });
  it('Élu rive droite : bob 160 (bastille+cite) > alice 150', () => {
    const droite = ['louvre-rivoli', 'bastille', 'cite'];
    const h = titleHolder(BEST, droite);
    expect(h?.playerId).toBe('bob');
    expect(h?.score).toBe(160);
  });
  it('Empereur (toutes stations) : bob 240 > alice 150', () => {
    const all = MEMBERS.map((m) => m.slug);
    expect(titleHolder(BEST, all)?.playerId).toBe('bob');
  });
});

describe('buildScopes', () => {
  const scopes = buildScopes(MEMBERS);
  const byKey = (scope: string, key: string) => scopes.find((s) => s.scope === scope && s.key === key);

  it('crée une station, une ligne, un arrondissement, une rive, un quartier, l\'empire', () => {
    expect(byKey('station', 'bastille')?.stations).toEqual(['bastille']);
    expect(byKey('line', 'M1')?.stations.sort()).toEqual(['bastille', 'louvre-rivoli']);
    expect(byKey('line', 'M4')?.stations.sort()).toEqual(['cite', 'odeon']);
    expect(byKey('arrondissement', 'arr-4')?.stations.sort()).toEqual(['bastille', 'cite']);
    expect(byKey('rive', 'rive-droite')?.stations.length).toBe(3);
    expect(byKey('rive', 'rive-gauche')?.stations).toEqual(['odeon']);
    expect(byKey('quartier', 'le-marais')?.stations).toEqual(['bastille']);
    expect(byKey('empire', 'empire')?.stations.length).toBe(4);
  });

  it('une station en correspondance appartient à plusieurs lignes', () => {
    // bastille est sur M1 ET M5
    expect(byKey('line', 'M5')?.stations).toEqual(['bastille']);
  });
});

describe('rankScope', () => {
  it('exclut les joueurs à 0 et trie par Σ décroissante', () => {
    const ranked = rankScope(BEST, ['bastille', 'odeon', 'cite']); // droite-ish + odeon
    expect(ranked[0].playerId).toBe('bob'); // 90+80+70 = 240
    expect(ranked.every((h) => h.score > 0)).toBe(true);
    expect(ranked.find((h) => h.playerId === 'carol')).toBeUndefined(); // 0 ici
  });
});
