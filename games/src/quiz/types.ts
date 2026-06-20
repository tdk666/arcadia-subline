/**
 * Archétype QUIZ — types du contenu CLIENT (copie de quest_steps.payload).
 * INVARIANT : le quiz ne calcule JAMAIS le score. Il connaît la bonne réponse
 * (champ `answer`) UNIQUEMENT pour le ressenti immédiat (feedback, vies, série).
 * L'autorité de notation reste fn_submit_attempt, qui compare la réponse soumise
 * à answer_key — jamais exposé au client. Cf. note d'invariant dans le HANDOFF.
 */
export interface QuizChoice {
  id: string;
  text: Record<string, string>;
}

export interface QuizQuestion {
  /** quest_step.id côté serveur — devient la clé de p_answers (1 question = 1 step). */
  stepId: string;
  points?: number;
  /** id du bon choix (jouabilité locale seulement ; le serveur tranche). */
  answer: string;
  question: Record<string, string>;
  choices: QuizChoice[];
}

export interface QuizParams {
  /** Vies : une mauvaise réponse en coûte une ; à zéro, la manche s'arrête. */
  lives: number;
  /** Chrono par question en secondes ; 0 = pas de chrono (palier bronze). */
  timerS: number;
  questions: QuizQuestion[];
}
