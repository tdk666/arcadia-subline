/**
 * Archétype QUIZ V2 — habillage « Le Cabinet des Merveilles » (Louvre-Rivoli).
 * Portrait, full DOM, conforme au contrat GameProps.
 *
 * DA : thème CLAIR « craie / papier chaud » (cohérent avec le reste de l'app),
 * texte encre sombre sur fond clair (contraste WCAG AA). Feedback couleur
 * UNIVERSEL et redondant (couleur + icône + libellé) : bonne réponse = VERT,
 * mauvaise = ROUGE, toujours — corrige le ressenti d'inversion du playtest.
 *
 * INVARIANT DE SÉCURITÉ : le quiz ne calcule JAMAIS de score. Il remonte les
 * réponses brutes (slug stepId → choix) ; fn_submit_attempt tranche. Le champ
 * `answer` sert UNIQUEMENT au ressenti local. Image + explication révélées
 * APRÈS la réponse uniquement (jamais avant — décision board).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../contract';
import { isUsableQuizImage, type QuizParams } from './types';
import { QuizAudio } from './audio';

const TIER_LABEL = { bronze: 'BRONZE', silver: 'ARGENT', gold: 'OR' } as const;
// teintes encrées lisibles sur fond clair (la couleur médaille pure est trop pâle)
const TIER_INK = { bronze: '#9c5f30', silver: '#6b7280', gold: '#9c7d18' } as const;

const OK = '#3f6b4d';      // guimard — succès
const KO = '#bb2e2a';      // vermillon — erreur
const INK = '#2a2118';     // pierre — texte primaire
const INK_DIM = '#5d5446'; // pierre-dim

const DEFAULTS: QuizParams = { lives: 3, timerS: 0, questions: [] };

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* non supporté */ }
}

export default function QuizGame({ ctx, onFinish, onQuit }: GameProps) {
  const en = ctx.locale.startsWith('en');
  const tr = useCallback((fr: string, eng: string) => (en ? eng : fr), [en]);
  const L = en ? 'en' : 'fr';

  const params: QuizParams = { ...DEFAULTS, ...(ctx.params as unknown as Partial<QuizParams>) };
  const questions = params.questions;

  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(params.lives);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(params.timerS);
  const [muted, setMuted] = useState(false);

  // ambiance « Cabinet des Merveilles » — débloquée au 1er geste, libérée au démontage
  const audio = useMemo(() => new QuizAudio(), []);
  useEffect(() => () => audio.dispose(), [audio]);
  const unlockAudio = useCallback(() => { audio.unlock(); audio.setMuted(muted); }, [audio, muted]);

  const answersRef = useRef<Record<string, string>>({});
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const livesAtPickRef = useRef(params.lives);

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
      setRevealed(true);
      if (correct) { vibrate(30); setStreak((s) => s + 1); }
      else { vibrate([55, 40, 55]); setStreak(0); }
      const nextLives = correct ? lives : lives - 1;
      livesAtPickRef.current = nextLives;
      setLives(nextLives);
    },
    [picked, q, lives],
  );

  const next = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length || livesAtPickRef.current <= 0) {
      finish();
    } else {
      setPicked(null);
      setRevealed(false);
      setIndex(nextIndex);
      setTimeLeft(params.timerS);
    }
  }, [index, questions.length, params.timerS, finish]);

  useEffect(() => {
    if (params.timerS <= 0 || picked !== null || doneRef.current || !q) return;
    if (timeLeft <= 0) { answer(null); return; }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timeLeft, picked, index, params.timerS, q, answer]);

  if (!q) return null;

  const correct = picked !== null && picked === q.answer;
  const timedOut = picked === '__timeout__';
  const urgent = params.timerS > 0 && picked === null && timeLeft <= 3;
  const ink = TIER_INK[ctx.difficulty];
  const showImage = revealed && isUsableQuizImage(q.image);

  return (
    <div
      className="relative flex h-full w-full select-none flex-col overflow-hidden"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif", background: 'var(--color-craie)', color: INK }}
      onPointerDown={unlockAudio}
    >
      {/* ── BARRE HAUTE : quitter · progression · vies · son ── */}
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.7rem)]">
        <button
          type="button"
          onClick={onQuit}
          aria-label={tr('Quitter', 'Quit')}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-rail bg-plomb text-sm font-semibold text-pierre-dim active:scale-95"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); const m = !muted; setMuted(m); audio.setMuted(m); }}
          aria-label={tr('Son', 'Sound')}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-rail bg-plomb text-sm active:scale-95"
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <div className="flex flex-1 gap-1.5">
          {questions.map((qq, i) => (
            <span
              key={qq.stepId}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i < index ? ink : i === index ? INK : 'var(--color-rail)' }}
            />
          ))}
        </div>
        <div className="flex flex-none items-center gap-0.5" aria-label={tr('Vies', 'Lives')}>
          {Array.from({ length: params.lives }).map((_, i) => (
            <span
              key={i}
              className="text-[15px] leading-none transition-all duration-300"
              style={{ opacity: i < lives ? 1 : 0.25, filter: i < lives ? 'none' : 'grayscale(1)' }}
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
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: ink }}>
            {TIER_LABEL[ctx.difficulty]}
          </span>
        </div>
        {streak >= 2 && (
          <span className="animate-pop rounded-full px-2.5 py-1 font-mono text-[11px] font-bold" style={{ background: 'rgba(201,162,39,0.16)', color: '#9c7d18' }}>
            🔥 {tr('série', 'streak')} {streak}
          </span>
        )}
      </div>

      {/* ── CHRONO (paliers argent/or) : compte à rebours CHIFFRÉ + barre ── */}
      {params.timerS > 0 && (
        <div className="mt-3 flex items-center gap-2.5 px-4">
          <span
            className={`flex-none font-mono text-sm font-extrabold tabular-nums ${urgent && !ctx.reducedMotion ? 'animate-pop' : ''}`}
            style={{ color: urgent ? KO : ink, minWidth: 30 }}
            aria-label={tr('Temps restant', 'Time left')}
          >
            ⏱ {picked === null ? timeLeft : 0}s
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-rail)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${picked === null ? (timeLeft / params.timerS) * 100 : 0}%`,
                background: urgent ? KO : 'linear-gradient(90deg,#e3c45a,#c9a227)',
                transition: 'width 1s linear, background 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {/* ── QUESTION (zone flexible/scrollable → les choix ne débordent jamais) ── */}
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: INK_DIM }}>
          {tr('Question', 'Question')} {index + 1}/{questions.length}
        </p>
        <h1
          key={q.stepId}
          className={`mt-2 font-display text-[clamp(1.35rem,5.5vw,2rem)] font-extrabold leading-tight ${ctx.reducedMotion ? '' : 'animate-slide-up'}`}
          style={{ color: INK }}
        >
          {q.question[L] ?? q.question.fr}
        </h1>
      </div>

      {/* ── CHOIX ── */}
      <div className="flex flex-col gap-2.5 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {q.choices.map((c) => {
          const isAnswered = picked !== null;
          const isCorrect = c.id === q.answer;
          const isPicked = c.id === picked;
          // bonne réponse = VERT (toujours mise en valeur), mauvaise choisie = ROUGE
          let bg = 'var(--color-plomb)';
          let border = 'var(--color-rail)';
          let fg: string = INK;
          let badge: string = ink;
          let mark = c.id.toUpperCase();
          if (isAnswered && isCorrect) { bg = OK; border = OK; fg = '#fff'; badge = 'rgba(255,255,255,0.25)'; mark = '✓'; }
          else if (isAnswered && isPicked && !isCorrect) { bg = KO; border = KO; fg = '#fff'; badge = 'rgba(255,255,255,0.25)'; mark = '✕'; }
          else if (isAnswered) { fg = INK_DIM; }
          return (
            <button
              key={c.id}
              type="button"
              disabled={isAnswered}
              onClick={() => answer(c.id)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-[transform] duration-150 ${
                isAnswered ? '' : 'active:scale-[0.98]'
              }`}
              style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1.5px ${border}`, opacity: isAnswered && !isCorrect && !isPicked ? 0.55 : 1 }}
            >
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-extrabold uppercase"
                style={{ background: badge, color: isAnswered && (isCorrect || isPicked) ? '#fff' : ink }}
              >
                {mark}
              </span>
              <span className="font-semibold leading-snug">{c.text[L] ?? c.text.fr}</span>
            </button>
          );
        })}
      </div>

      {/* ── CARTE DE REVEAL (image + explication + feedback) — APRÈS la réponse ── */}
      {revealed && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/30" onClick={next}>
          <div
            className={`rounded-t-3xl border-t-4 bg-plomb px-5 pb-[max(env(safe-area-inset-bottom),1.1rem)] pt-4 ${ctx.reducedMotion ? '' : 'animate-slide-up'}`}
            style={{ borderColor: correct ? OK : timedOut ? '#c9a227' : KO }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex items-center gap-2 font-display text-lg font-extrabold" style={{ color: correct ? OK : timedOut ? '#9c7d18' : KO }}>
              <span>{correct ? '✓' : timedOut ? '⏱' : '✕'}</span>
              {correct ? tr('Bonne réponse !', 'Correct!') : timedOut ? tr('Temps écoulé', "Time's up") : tr('Mauvaise réponse', 'Wrong answer')}
            </p>

            {showImage && (
              <figure className="mt-3">
                <img
                  src={q.image!.url}
                  alt=""
                  loading="lazy"
                  className="max-h-44 w-full rounded-xl object-cover"
                  style={{ background: 'var(--color-craie-2)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                {(q.image!.attribution || q.image!.license) && (
                  <figcaption className="mt-1 font-mono text-[9px] leading-tight text-pierre-faint">
                    {[q.image!.source, q.image!.license, q.image!.attribution].filter(Boolean).join(' · ')}
                  </figcaption>
                )}
              </figure>
            )}

            {q.explain && (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: INK_DIM }}>{q.explain[L] ?? q.explain.fr}</p>
            )}

            <button
              type="button"
              onClick={next}
              className="mt-4 w-full rounded-2xl py-3.5 font-display text-base font-extrabold text-encre active:translate-y-[2px]"
              style={{ background: 'var(--color-laiton)', boxShadow: '0 4px 0 rgba(0,0,0,0.18)' }}
            >
              {index + 1 >= questions.length || livesAtPickRef.current <= 0
                ? tr('Voir le résultat', 'See result')
                : tr('Continuer', 'Continue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
