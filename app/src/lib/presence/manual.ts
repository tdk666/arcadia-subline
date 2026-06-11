import { backend } from '../backend';
import type { CheckInResult } from '../backend/types';
import type { PresenceProvider } from './types';

/**
 * MVP : check-in MANUEL (déclaratif). La crédibilité repose sur le serveur :
 * confiance 0.60 imposée par trigger, TTL 10 min, cooldown anti-téléportation
 * 90 s entre stations distinctes — rien n'est arbitré ici.
 */
export class ManualPresenceProvider implements PresenceProvider {
  readonly id = 'manual' as const;
  readonly method = 'manual' as const;

  async isAvailable(): Promise<boolean> {
    return true; // toujours possible : c'est le plancher de l'échelle
  }

  checkIn(stationId: string): Promise<CheckInResult> {
    return backend.checkIn(stationId, this.method);
  }
}
