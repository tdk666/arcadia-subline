/**
 * COSMÉTIQUES — le contenu de la boutique. v1 : des « halos » d'avatar (l'anneau
 * sous la mascotte sur la carte), 100 % code → vraie dépense de jetons sans
 * dépendre d'assets. Les tenues de mascotte (illustrées) viendront ensuite.
 * Aligné monétisation de la vision (cosmétiques), jamais de pay-to-win.
 */
import type { LocalizedText } from '../i18n';

export type CosmeticSlot = 'aura';

export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  name: LocalizedText;
  /** Coût en jetons (0 = offert par défaut). */
  cost: number;
  /** Couleur de l'anneau d'avatar (hex). */
  color: string;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'aura-email', slot: 'aura', name: { fr: 'Halo Émail', en: 'Enamel Halo' }, cost: 0, color: '#0a5a9e' },
  { id: 'aura-laiton', slot: 'aura', name: { fr: 'Halo Laiton', en: 'Brass Halo' }, cost: 60, color: '#c9a227' },
  { id: 'aura-vermillon', slot: 'aura', name: { fr: 'Halo Vermillon', en: 'Vermilion Halo' }, cost: 80, color: '#bb2e2a' },
  { id: 'aura-guimard', slot: 'aura', name: { fr: 'Halo Guimard', en: 'Guimard Halo' }, cost: 80, color: '#3f6b4d' },
];

/** Cosmétique offert d'office (équipé au départ). */
export const DEFAULT_OWNED = ['aura-email'];

export function cosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** Couleur d'anneau de l'aura équipée (repli sur l'émail). */
export function auraColor(equippedAura: string): string {
  return cosmetic(equippedAura)?.color ?? '#0a5a9e';
}
