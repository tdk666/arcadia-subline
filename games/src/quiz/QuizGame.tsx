/**
 * Archétype QUIZ — habillage « Le Cabinet des Merveilles » (Louvre-Rivoli).
 * Portrait, full DOM (zéro canvas), conforme au contrat GameProps.
 *
 * INVARIANT DE SÉCURITÉ : le quiz ne calcule JAMAIS de score. Il remonte les
 * réponses brutes du joueur dans `answers`, keyé par quest_step.id —
 * fn_submit_attempt les compare à answer_key (jamais exposé) et tranche.
 * Le champ `answer` du contenu sert UNIQUEMENT au ressenti local (feedback,
 * vies, série) — cf. note d'invariant dans docs/HANDOFF.md.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../contract';
import type { QuizParams } from './types';

const TIER_LABEL = { bronze: 'BRONZE', silver: 'ARGENT', gold: 'OR' } as const;
const TIER_TINT = { bronze: '#c08a55', silver: '#b9c0c4', gold: '#e3c463' } as const;

const DEFAULTS: QuizParams = { lives: 3, timerS: 0, questions: [] };

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* non supporté */ }
}

export default function QuizGame({ ctx, onFinish, onQuit }: GameProps) {
  const en = ctx.locale.startsWith('en');
  const tr = useCallback((fr: string, eng: string) => (en ? eng : fr), [en]);

  const params: QuizParams = { ...DEFAULTS, ...(ctx.params as unknown as Partial<QuizParams>) };
  const questions = params.questions;

  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(params.lives);
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(params.timerS);

  const answersRef = useRef<Record<string, string>>({});
  const startRef = useRef(0);
  const doneRef = useRef(false);

  if (startRef.current === 0) startRef.current = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const allCorrect =
      questions.length > 0 && questions.every((q) => answersRef.current[q.stepId] === q.answer);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    onFinish({
      completed: true,
      clientWin: allCorrect,
      durationMs: Math.round(now - startRef.current),
      answers: answersRef.current,
    });
  }, [questions, onFinish]);

  // Aucune question (contenu manquant) : on clôt proprement plutôt que de figer.
  useEffect(() => {
    if (questions.length === 0) finish();
  }, [questions.length, finish]);

  const q = questions[index];

  const answer = useCallback(
    (choiceId: string | null) => {
      if (picked !== null || doneRef.current || !q) return;
      const correct = choiceId !== null && choiceId === q.answer;
      if (choiceId !== null) answersRef.current[q.stepId] = choiceId;
      setPicked(choiceId ?? '__timeout__');
      if (correct) { vibrate(30); setStreak((s) => s + 1); }
      else { vibrate([55, 40, 55]); setStreak(0); }
      const nextLives = correct ? lives : lives - 1;
      setLives(nextLives);

      const delay = ctx.reducedMotion ? 360 : 1050;
      window.setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= questions.length || nextLives <= 0) {
          finish();
        } else {
          setPicked(null);
          setIndex(nextIndex);
          setTimeLeft(params.timerS);
        }
      }, delay);
    },
    [picked, q, lives, index, questions.length, params.timerS, ctx.reducedMotion, finish],
  );

  // Chrono par question (paliers argent/or). Au temps mort = réponse manquée.
  useEffect(() => {
    if (params.timerS <= 0 || picked !== null || doneRef.current || !q) return;
    if (timeLeft <= 0) { answer(null); return; }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timeLeft, picked, index, params.timerS, q, answer]);

  if (!q) return null;

  const urgent = params.timerS > 0 && picked === null && timeLeft <= 3;
  const tint = TIER_TINT[ctx.difficulty];

  return (
    <div
      className="relative flex h-full w-full flex-col select-none overflow-hidden"
      style={{
        fontFamily: "'Work Sans', system-ui, sans-serif",
        background: 'radial-gradient(125% 90% at 50% -10%, #1d2b44 0%, #131b2c 55%, #0c111d 100%)',
      }}
    >
      {/* ── BARRE HAUTE : quitter · progression · vies ── */}
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.7rem)]">
        <button
          type="button"
          onClick={onQuit}
          aria-label={tr('Quitter', 'Quit')}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-sm font-semibold text-white/70 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.08)', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.12)' }}
        >
          ✕
        </button>

        {/* progression : segments qui se remplissent à mesure des questions */}
        <div className="flex flex-1 gap-1.5">
          {questions.map((qq, i) => (
            <span
              key={qq.stepId}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i < index ? tint : i === index ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.14)' }}
            />
          ))}
        </div>

        {/* vies : cœurs qui se vident */}
        <div className="flex flex-none items-center gap-0.5" aria-label={tr('Vies', 'Lives')}>
          {Array.from({ length: params.lives }).map((_, i) => (
            <span
              key={i}
              className="text-[15px] leading-none transition-all duration-300"
              style={{ opacity: i < lives ? 1 : 0.22, filter: i < lives ? 'none' : 'grayscale(1)' }}
            >
              {i < lives ? '❤️' : '🤍'}
            </span>
          ))}
        </div>
      </div>

      {/* ── PLAQUE STATION + palier + série ── */}
      <div className="mt-3 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded-[4px] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white"
            style={{ background: '#0a5a9e', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)' }}
          >
            {ctx.stationName}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: tint }}>
            {TIER_LABEL[ctx.difficulty]}
          </span>
        </div>
        {streak >= 2 && (
          <span className="animate-pop rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold" style={{ color: '#e3c463' }}>
            🔥 {tr('série', 'streak')} {streak}
          </span>
        )}
      </div>

      {/* ── CHRONO (paliers argent/or) ── */}
      {params.timerS > 0 && (
        <div className="mt-3 px-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${picked === null ? (timeLeft / params.timerS) * 100 : 0}%`,
                background: urgent ? '#e0524a' : 'linear-gradient(90deg,#e3c45a,#c9a227)',
                transition: 'width 1s linear, background 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {/* ── QUESTION ── */}
      <div className="flex flex-1 flex-col justify-center px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          {tr('Question', 'Question')} {index + 1}/{questions.length}
        </p>
        <h1
          key={q.stepId}
          className={`mt-2 font-display text-[clamp(1.35rem,5.5vw,2rem)] font-extrabold leading-tight text-[#f4eeda] ${ctx.reducedMotion ? '' : 'animate-slide-up'}`}
        >
          {q.question[en ? 'en' : 'fr'] ?? q.question.fr}
        </h1>
      </div>

      {/* ── CHOIX ── */}
      <div className="flex flex-col gap-2.5 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {q.choices.map((c) => {
          const isAnswered = picked !== null;
          const isCorrect = c.id === q.answer;
          const isPicked = c.id === picked;
          // Révélation : la bonne réponse s'allume en vert, le mauvais choix en rouge.
          let bg = 'rgba(255,255,255,0.06)';
          let ring = 'rgba(255,255,255,0.14)';
          let fg = '#e9eef5';
          if (isAnswered && isCorrect) { bg = 'rgba(63,107,77,0.85)'; ring = '#7bd39a'; fg = '#fff'; }
          else if (isAnswered && isPicked && !isCorrect) { bg = 'rgba(176,46,42,0.8)'; ring = '#e88a86'; fg = '#fff'; }
          else if (isAnswered) { fg = 'rgba(233,238,245,0.45)'; }
          return (
            <button
              key={c.id}
              type="button"
              disabled={isAnswered}
              onClick={() => answer(c.id)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-[transform,background,box-shadow] duration-150 ${
                isAnswered ? '' : 'active:scale-[0.98]'
              }`}
              style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1.5px ${ring}` }}
            >
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-extrabold uppercase"
                style={{ background: 'rgba(0,0,0,0.25)', color: isAnswered && isCorrect ? '#fff' : tint }}
              >
                {isAnswered && isCorrect ? '✓' : isAnswered && isPicked ? '✕' : c.id}
              </span>
              <span className="font-semibold leading-snug">{c.text[en ? 'en' : 'fr'] ?? c.text.fr}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
