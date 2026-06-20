/**
 * Archétype QUIZ V2 — types du contenu CLIENT (copie de quest_steps.payload).
 * INVARIANT : le quiz ne calcule JAMAIS le score. Il connaît la bonne réponse
 * (champ `answer`) UNIQUEMENT pour le ressenti immédiat (feedback, vies, série).
 * L'autorité de notation reste fn_submit_attempt, qui compare la réponse soumise
 * à answer_key — jamais exposé au client. Cf. note d'invariant dans le HANDOFF.
 *
 * V2 : banque large (bankTarget) tirée à `draw` items par manche, image +
 * explication révélées APRÈS la réponse (decision board, jamais avant).
 */
export interface QuizChoice {
  id: string;
  text: Record<string, string>;
}

/** Visuel optionnel d'un item, révélé en carte post-réponse. */
export interface QuizImage {
  url: string;
  source?: string;
  license?: string;
  attribution?: string;
  /** 'verified' = sourcé + licence tracée ; 'to_verify' = pas encore d'URL jouable. */
  status?: string;
}

export interface QuizQuestion {
  /** Identifiant stable de l'item (slug, ex. "louvre-b-01") = clé de p_answers. */
  stepId: string;
  points?: number;
  /** id du bon choix (jouabilité locale seulement ; le serveur tranche). */
  answer: string;
  question: Record<string, string>;
  choices: QuizChoice[];
  /** Micro-explication révélée après la réponse (récompense culturelle). */
  explain?: Record<string, string> | null;
  /** Visuel révélé après la réponse (si verifié). */
  image?: QuizImage | null;
}

export interface QuizParams {
  /** Vies : une mauvaise réponse en coûte une ; à zéro, la manche s'arrête. */
  lives: number;
  /** Chrono par question en secondes ; 0 = pas de chrono (palier bronze). */
  timerS: number;
  /** Nombre d'items tirés par manche (V2). Le host fait le tirage en amont. */
  draw?: number;
  /** Taille cible de la banque du palier (métadonnée). */
  bankTarget?: number;
  /** Items à jouer cette manche (déjà tirés par le host parmi la banque). */
  questions: QuizQuestion[];
}

/** Une URL d'image est-elle rendable telle quelle (pas une page wiki, pas vide) ? */
export function isUsableQuizImage(img?: QuizImage | null): img is QuizImage {
  return (
    !!img &&
    img.status === 'verified' &&
    typeof img.url === 'string' &&
    /\.(jpe?g|png|webp|gif|svg)$/i.test(img.url) &&
    !img.url.includes('/wiki/')
  );
}
