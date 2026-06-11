/**
 * PRESENCE PROVIDER — la localisation comme SUR-COUCHE pluggable.
 * Le jeu ne dépend JAMAIS d'un provider : la présence enrichit (statut
 * "maîtrisé"), elle ne conditionne aucun gameplay.
 *
 * Pour brancher un nouveau mode (photo/IA, inertiel, QR/NFC) : implémenter
 * cette interface et l'ajouter au registre — AUCUN écran à réécrire,
 * StationScreen itère sur les providers disponibles.
 */
import type { CheckInResult } from '../backend/types';

export type PresenceMethod = 'manual' | 'geo' | 'qr';

export interface PresenceProvider {
  /** Identifiant stable du provider (UI, télémétrie). */
  id: 'manual' | 'photo-ocr' | 'inertial' | 'qr-nfc';
  /** Valeur envoyée au backend (enum checkin_method). */
  method: PresenceMethod;
  /** Le provider est-il utilisable sur cet appareil, maintenant ? */
  isAvailable(): Promise<boolean>;
  /**
   * Tente la validation de présence. Le cooldown et le niveau de confiance
   * sont TOUJOURS arbitrés côté serveur — le provider ne fait que collecter
   * la preuve (déclaration, photo, signature inertielle…).
   */
  checkIn(stationId: string): Promise<CheckInResult>;
}
