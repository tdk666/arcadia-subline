export const fr = {
  app: { name: 'Arcadia SubLine', tagline: 'Conquiers ta ligne' },
  nav: { map: 'Carte', leaderboard: 'Classement', profile: 'Profil' },
  common: {
    back: 'Retour', cancel: 'Annuler', loading: 'Chargement…', retry: 'Réessayer',
    soon: 'Bientôt', error: 'Une erreur est survenue', offline: 'Hors connexion',
  },
  demo: {
    banner: 'Mode démo — scores simulés localement',
    detail: 'Branche tes clés Supabase pour activer les scores réels.',
  },
  map: {
    title: 'Ligne 1', subtitle: 'La Défense — Château de Vincennes',
    conquered: '{n} station conquise', conqueredPlural: '{n} stations conquises',
    playWithoutAccount: 'Joue sans compte — ta première conquête t’attend.',
    challengeAvailable: 'Défi disponible',
  },
  station: {
    states: { locked: 'À conquérir', discovered: 'Découverte', visited: 'Visitée', mastered: 'Maîtrisée' },
    mastery: 'Maîtrise', play: 'Jouer', replay: 'Rejouer',
    story: { title: 'L’histoire', lockedHint: 'Gagne une partie pour débloquer la fiche savoir.' },
    master: { title: 'Maître de la station', hint: 'Maîtrise ≥ 80 + présence vérifiée sur place.', earned: 'Tu es Maître de cette station !' },
    comingSoon: 'Cette station ouvrira bientôt son défi.',
    tiers: { bronze: 'Bronze', silver: 'Argent', gold: 'Or' },
    tierLocked: 'Termine le palier précédent',
    tierDone: 'Réussi',
    rules: {
      bronze: '{shots} boulets · forteresse standard',
      silver: '{shots} boulets · murs renforcés · {pct} % à détruire',
      gold: '{shots} boulets · plaques de fer · {pct} % · {time} s chrono',
    },
  },
  checkin: {
    title: 'Tu es sur place ?',
    subtitle: 'Confirme ta présence pour viser le statut de Maître.',
    cta: 'Je suis à {station}',
    done: 'Présence validée',
    activeUntil: 'Check-in actif',
    cooldown: 'Trop rapide depuis ton dernier check-in ailleurs — patiente un instant ({s} s).',
    needAccount: 'Crée un compte pour valider ta présence.',
    optional: 'Optionnel — le jeu reste jouable sans.',
    methodManual: 'Déclaratif',
    future: 'Bientôt : photo de la plaque (IA) et détection de trajet.',
  },
  game: {
    quit: 'Quitter la partie ?', quitConfirm: 'Quitter', quitStay: 'Continuer',
    submitting: 'Calcul du score serveur…',
  },
  result: {
    victory: 'Victoire !', defeat: 'La forteresse tient bon…',
    score: 'Score', xp: 'XP', mastery: 'Maîtrise',
    bestScore: 'Pas de progression sur ton meilleur score — l’XP récompense la marge.',
    flagged: 'Tentative signalée par le serveur (durée ou télémétrie anormale).',
    localOnly: 'Partie non sauvegardée',
    replay: 'Rejouer', nextTier: 'Palier suivant', toLeaderboard: 'Voir le classement', toStation: 'Retour station',
    guestSave: {
      title: 'Sauve ta conquête !',
      body: 'Crée un compte pour enregistrer ton score, ta maîtrise et grimper au classement de la ligne.',
      cta: 'Créer mon compte', later: 'Plus tard',
    },
  },
  auth: {
    signupTitle: 'Créer un compte', loginTitle: 'Se connecter',
    email: 'Email', password: 'Mot de passe (8+ caractères)', displayName: 'Pseudo',
    signup: 'Créer mon compte', login: 'Connexion',
    toLogin: 'Déjà un compte ? Connexion', toSignup: 'Pas de compte ? Inscription',
    signoutCta: 'Se déconnecter',
    errors: {
      generic: 'Échec — vérifie tes identifiants.',
      demoMode: 'Mode démo : ajoute tes clés Supabase pour activer les comptes.',
    },
    pendingSync: 'Tes victoires invitées vont être enregistrées…',
  },
  leaderboard: {
    title: 'Classement', subtitle: 'Ligne 1 — conquiers ta ligne',
    empty: 'Personne au classement pour l’instant. Sois le premier !',
    you: 'toi', rank: 'Rang', player: 'Joueur', score: 'Score',
    guestHint: 'Crée un compte pour apparaître au classement.',
  },
  profile: {
    title: 'Profil', guest: 'Voyageur invité',
    xp: 'XP total', streak: 'Série', streakUnit: 'j', stations: 'Stations conquises',
    language: 'Langue', install: 'Installer l’app',
    installHint: 'Ajoute Arcadia à ton écran d’accueil pour jouer en plein écran.',
    connected: 'Connecté : {email}',
    localProgress: 'Progression locale (invité)',
  },
} as const;

/**
 * Arbre de clés : EN doit être STRUCTURELLEMENT identique à FR
 * (mêmes clés, valeurs librement traduites).
 */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof fr>;
