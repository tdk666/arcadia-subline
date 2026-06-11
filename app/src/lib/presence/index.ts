/**
 * Registre des modes de présence, du plancher vers la magie (vision §5) :
 *   1. manual    — MVP, livré ici
 *   2. photo-ocr — V2 : photo de la plaque → OCR/IA ("validé : tu es à Châtelet").
 *                  Brancher : provider qui upload la photo vers une Edge
 *                  Function de vérification, puis insert check_ins method='qr'
 *                  ou 'geo' selon la politique de confiance retenue.
 *   3. inertial  — V2 : signature accéléro/gyro du métro + graphe ordonné de
 *                  la ligne → déduction station par station SANS signal.
 *   4. qr-nfc    — Phase 2 (partenariat IDFM) : balises physiques en station.
 * L'UI consomme ce tableau tel quel : ajouter un provider = l'ajouter ici.
 */
import { ManualPresenceProvider } from './manual';
import type { PresenceProvider } from './types';

export const presenceProviders: PresenceProvider[] = [
  new ManualPresenceProvider(),
  // new PhotoOcrPresenceProvider(),   ← V2, interface déjà stable
  // new InertialPresenceProvider(),   ← V2, interface déjà stable
];

export * from './types';
