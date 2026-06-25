/**
 * Feature flags client — interrupteurs runtime SANS suppression de code.
 *
 * PRESENCE_REQUIRED : miroir client du réglage serveur `arcadia.presence_required`
 * (migration 0022). DÉFAUT = false → la présence (check-in) n'est PAS exigée pour
 * marquer des points : tout compte, partout (test J+1 lisible, DEC-018). La présence
 * redeviendra un MULTIPLICATEUR/“Vérifié”, jamais un gate dur (arbitrage board).
 *
 * RÉACTIVER la présence (futur, in-situ) :
 *   1) serveur : `ALTER DATABASE postgres SET arcadia.presence_required='true';`
 *   2) client  : passer PRESENCE_REQUIRED à true ici.
 * Les deux doivent être cohérents (le serveur fait foi sur le score, le client sur l'UI).
 */
export const PRESENCE_REQUIRED = false;
