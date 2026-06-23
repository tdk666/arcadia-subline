import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getGame, TIER_ORDER,
  type DifficultyTier, type GameProps, type GameResult, type QuizQuestion,
} from '@arcadia/games';
import { pickText, useI18n } from '../i18n';
import { backend } from '../lib/backend';
import { getStationContent, isBankedQuiz, tierThreshold, type StationContent } from '../lib/content';
import { drawBank, previewBankedQuizScore, previewDemolitionScore } from '../lib/scoring';
import { track } from '../lib/analytics';
import { tap } from '../lib/feedback';
import { useArcadia, type LastResult } from '../store';
import { ResultView } from '../components/ResultView';
import { OrientationGate } from '../components/OrientationGate';

const TIER_COLOR: Record<DifficultyTier, string> = {
  bronze: '#c08a55', silver: '#b9c0c4', gold: '#e3c463',
};
// variantes encrées (texte lisible sur fond clair — la couleur médaille pure est trop pâle)
const TIER_INK: Record<DifficultyTier, string> = {
  bronze: '#9c5f30', silver: '#6b7280', gold: '#9c7d18',
};

export function GameScreen() {
  const { slug = '', tier = 'bronze' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const content = getStationContent(slug);
  const difficulty = (TIER_ORDER as readonly string[]).includes(tier)
    ? (tier as DifficultyTier)
    : 'bronze';

  const user = useArcadia((s) => s.user);
  const recordResult = useArcadia((s) => s.recordResult);
  const queuePending = useArcadia((s) => s.queuePending);
  const isTierUnlocked = useArcadia((s) => s.isTierUnlocked);
  const tiersWonAll = useArcadia((s) => s.tiersWon);

  // Mode EXPRESS (défi du jour, ?x=1) : on saute le briefing UNIQUEMENT pour une
  // station déjà connue (un palier gagné) → on enseigne une fois, puis 1-tap pour
  // toujours (réponse à « trop long » du playtest + loi UX #2). 1er contact = brief.
  const knowsStation = (tiersWonAll[slug] ?? []).length > 0;
  const wantsExpress = searchParams.get('x') === '1' && knowsStation;

  // brief → play → submitting → result ; runId force un moteur neuf au rejouer
  const [phase, setPhase] = useState<'brief' | 'play' | 'submitting' | 'result'>('brief');
  const [runId, setRunId] = useState(0);
  // progression de banque chargée (gate du démarrage express : ne pas tirer une
  // manche avant de connaître les items déjà réussis à exclure)
  const [progressReady, setProgressReady] = useState(false);
  const [result, setResult] = useState<LastResult | null>(null);
  const [quitAsk, setQuitAsk] = useState(false);
  // Banque V2 : items tirés pour cette manche + progression cumulée (points/réussis)
  const [drawn, setDrawn] = useState<QuizQuestion[] | null>(null);
  const [bankProgress, setBankProgress] = useState<{ pointsTotal: number; passed: string[] }>({ pointsTotal: 0, passed: [] });

  const banked = !!content && isBankedQuiz(content);
  const questId = content?.quests[difficulty]?.questId;

  const allowed = !!content && isTierUnlocked(slug, difficulty);

  // Banque : on récupère les items déjà réussis (à exclure du tirage) + le cumul.
  useEffect(() => {
    if (!banked || !questId) { setProgressReady(true); return; } // rien à charger
    let live = true;
    setProgressReady(false);
    void backend.getQuestProgress([questId]).then((list) => {
      if (!live) return;
      const p = list.find((x) => x.questId === questId);
      setBankProgress({ pointsTotal: p?.pointsTotal ?? 0, passed: p?.passedStepIds ?? [] });
      setProgressReady(true);
    });
    return () => { live = false; };
  }, [banked, questId, runId]);

  // DÉMARRAGE EXPRESS (défi du jour) : dès que la progression est prête, on lance
  // directement la manche (mêmes effets que le CTA du briefing), brief sauté.
  useEffect(() => {
    if (!wantsExpress || !allowed || !content) return;
    if (phase !== 'brief' || !progressReady) return;
    const c = content;
    const q = c.quests[difficulty];
    try {
      if (!localStorage.getItem('arcadia.firstplay.v1')) {
        localStorage.setItem('arcadia.firstplay.v1', '1');
        track('first_play', { slug, tier: difficulty });
      }
    } catch { /* noop */ }
    track('game_start', { slug, tier: difficulty, express: true });
    if (isBankedQuiz(c)) {
      const p = q.params as Record<string, unknown>;
      const b = (p.questions as QuizQuestion[] | undefined) ?? [];
      setDrawn(drawBank(b, Number(p.draw ?? b.length), bankProgress.passed));
    }
    setPhase('play');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsExpress, allowed, content, phase, progressReady]);

  // redirection HORS rendu (la naviguer pendant le rendu casse React Router)
  useEffect(() => {
    if (!allowed) navigate(`/station/${slug}`, { replace: true });
  }, [allowed, navigate, slug]);

  // funnel : vue du briefing (une par entrée dans le brief)
  useEffect(() => {
    if (phase === 'brief') track('brief_view', { slug, tier: difficulty });
  }, [phase, slug, difficulty]);

  const Game = useMemo(() => {
    if (!content) return null;
    const def = getGame(content.game.archetype);
    return lazy(def.load) as React.ComponentType<GameProps>;
  }, [content]);

  // orientation requise par l'archétype (démolition = paysage)
  const orientation = content ? (getGame(content.game.archetype).orientation ?? 'portrait') : 'portrait';

  if (!allowed || !content || !Game) return null;

  const quest = content.quests[difficulty];
  const brief = content.briefs[difficulty];
  const archetype = content.game.archetype;
  const isQuiz = archetype === 'quiz';
  const params = quest.params as Record<string, number>;
  const bank = (quest.params.questions as QuizQuestion[] | undefined) ?? [];

  // Tirage de la manche : `draw` items au hasard, en excluant ceux déjà réussis.
  function drawRound(): QuizQuestion[] {
    const drawN = Number((quest.params as Record<string, unknown>).draw ?? bank.length);
    return drawBank(bank, drawN, bankProgress.passed);
  }

  // params passés au moteur : pour la banque, on substitue les items tirés
  const playParams: Record<string, unknown> = banked && drawn ? { ...quest.params, questions: drawn } : quest.params;

  async function onFinish(gameResult: GameResult) {
    const c = content as StationContent;
    // p_answers — la forme dépend de l'archétype, mais le SERVEUR note, jamais nous :
    //  · quiz       : { "<stepId slug>": "<choiceId>", … } (1 item = 1 step) → tel quel
    //  · démolition : { "<step_id uuid>": télémétrie } (terrain mono-étape) → enveloppé
    const answers = isQuiz
      ? (gameResult.answers as Record<string, unknown>)
      : { [stepIdForQuest(c, difficulty)]: gameResult.answers };

    // Aperçu local SANS autorité (démo + panne + invité), miroir de fn_submit_attempt
    const preview = (best = 0) =>
      isQuiz
        ? previewBankedQuizScore(
            bank, difficulty, gameResult.answers, gameResult.durationMs,
            tierThreshold(c, difficulty), bankProgress.pointsTotal, bankProgress.passed,
          )
        : previewDemolitionScore(quest.params, difficulty, gameResult.answers, gameResult.durationMs, best);

    setPhase('submitting');
    let r: LastResult;
    if (backend.mode === 'demo' || user) {
      try {
        const server = await backend.submitAttempt(quest.questId, answers, gameResult.durationMs);
        r = { ...server, slug: c.slug, tier: difficulty, localOnly: false };
      } catch (e) {
        console.warn('submitAttempt:', e);
        // panne réseau/serveur : aperçu local + mise en file (rejouée plus tard)
        r = { ...preview(), slug: c.slug, tier: difficulty, localOnly: true };
        if (r.success) queuePending({ questId: quest.questId, slug: c.slug, tier: difficulty, answers, durationMs: gameResult.durationMs });
      }
    } else {
      // invité (mode Supabase) : aperçu local, la tentative gagnante est mise en
      // file et soumise via fn_submit_attempt dès la création du compte
      r = { ...preview(), slug: c.slug, tier: difficulty, localOnly: true };
      if (r.success) queuePending({ questId: quest.questId, slug: c.slug, tier: difficulty, answers, durationMs: gameResult.durationMs });
    }
    recordResult(r);
    setResult(r);
    setPhase('result');
    track('game_result', { slug, tier: difficulty, success: r.success, flagged: r.flagged, score: r.score });
  }

  function replay(nextTier?: DifficultyTier) {
    if (nextTier) {
      navigate(`/play/${slug}/${nextTier}`, { replace: true });
    }
    setResult(null);
    setRunId((n) => n + 1);
    setPhase('brief');
  }

  return (
    <div className="fixed inset-0 bg-craie">
      {/* UNE seule rotation pour brief + assaut (même axe paysage, plus de
          bascule au milieu). Le résultat/archive se lit dans n'importe quel sens. */}
      <OrientationGate active={orientation === 'landscape' && phase !== 'result'}>
      {/* ── BRIEFING : le cadre narratif pose l'enjeu avant l'assaut ── */}
      {/* défilable : sur petit écran le CTA reste toujours atteignable (jamais rogné) */}
      {phase === 'brief' && (
        <div className="h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-6 px-7 py-8 text-center">
          <div className="animate-slide-up w-full">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: TIER_INK[difficulty] }}>
              {pickText(brief.date, locale)}
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-pierre">
              {pickText(brief.title, locale)}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-pierre-dim">
              {pickText(brief.body, locale)}
            </p>
          </div>

          <div className="animate-slide-up w-full rounded-2xl border border-rail bg-plomb/80 px-5 py-4 text-left" style={{ animationDelay: '0.12s' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-pierre-faint">{t('brief.objective')}</p>
            {isQuiz ? (
              <>
                <p className="mt-1.5 text-sm font-semibold text-pierre">
                  ⚜ {t('brief.quizObjective', { n: Number((quest.params as Record<string, unknown>).draw ?? bank.length) })}
                  <br />❤️ {t('brief.quizLives', { n: Number(params.lives ?? 3) })}
                  {Number(params.timerS ?? 0) > 0 && <><br />⏱ {t('brief.quizTimer', { time: Number(params.timerS) })}</>}
                </p>
                <p className="mt-2 border-t border-rail pt-2 font-mono text-[10px] leading-relaxed text-pierre-faint">
                  {t('brief.quizHowto')}
                </p>
              </>
            ) : (
              <>
                {/* objectif PRINCIPAL en gros (les étendards), conditions en secondaire */}
                <p className="mt-1.5 text-lg font-extrabold leading-snug text-pierre">
                  ⚜ {t('brief.objectiveText', { targets: 3 })}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-pierre-dim">
                  {params.targetPct > 0 && <>💥 {t('brief.objectiveExtra', { pct: params.targetPct })} · </>}
                  {params.timeLimitS > 0 && <>⏱ {t('brief.objectiveTime', { time: params.timeLimitS })} · </>}
                  🪨 {t('brief.objectiveAmmo', { n: params.maxShots })}
                </p>
                <p className="mt-2 border-t border-rail pt-2 font-mono text-[10px] leading-relaxed text-pierre-faint">
                  {t('brief.howto')}
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              tap();
              try {
                if (!localStorage.getItem('arcadia.firstplay.v1')) {
                  localStorage.setItem('arcadia.firstplay.v1', '1');
                  track('first_play', { slug, tier: difficulty });
                }
              } catch { /* noop */ }
              track('game_start', { slug, tier: difficulty });
              if (banked) setDrawn(drawRound()); // tirage frais à chaque manche
              setPhase('play');
            }}
            className="animate-pop w-full max-w-xs rounded-2xl py-4 font-display text-lg font-extrabold text-encre shadow-[0_5px_0_rgba(0,0,0,0.22),0_0_30px_rgba(242,194,0,0.35)] ring-1 ring-inset ring-white/40 transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_2px_0_rgba(0,0,0,0.22),0_0_20px_rgba(242,194,0,0.3)]"
            style={{ background: TIER_COLOR[difficulty], animationDelay: '0.25s' }}
          >
            {isQuiz ? '🎓' : '⚔'} {t(isQuiz ? 'brief.quizCta' : 'brief.cta')}
          </button>
          <button
            type="button"
            onClick={() => { track('drop_off', { slug, tier: difficulty }); navigate(`/station/${slug}`); }}
            className="font-mono text-xs text-pierre-faint active:text-pierre-dim"
          >
            ← {t('common.back')}
          </button>
        </div>
        </div>
      )}

      {/* ── JEU (plein cadre paysage) ── */}
      {(phase === 'play' || phase === 'submitting') && (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-pierre-faint">
              {t('common.loading')}
            </div>
          }
        >
          <Game
            key={runId}
            ctx={{
              questId: quest.questId,
              stationId: content.stationId,
              stationSlug: content.slug,
              stationName: content.name,
              difficulty,
              params: playParams,
              locale,
              reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            }}
            onFinish={onFinish}
            onQuit={() => setQuitAsk(true)}
          />
        </Suspense>
      )}

      {phase === 'submitting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-sm text-ambre">
          {t('game.submitting')}
        </div>
      )}

      {phase === 'result' && result && (
        <ResultView
          result={result}
          station={content}
          onReplay={() => replay()}
          onNextTier={(nt) => replay(nt)}
        />
      )}

      {quitAsk && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-8">
          <div className="animate-pop w-full max-w-xs rounded-2xl border border-rail bg-plomb p-5 text-center">
            <p className="font-display font-bold">{t('game.quit')}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-rail py-2.5 text-sm text-pierre-dim active:bg-plomb-hi"
                onClick={() => { track('game_quit', { slug, tier: difficulty }); navigate(`/station/${slug}`); }}
              >
                {t('game.quitConfirm')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-laiton py-2.5 font-bold text-sm text-encre active:scale-[0.98]"
                onClick={() => setQuitAsk(false)}
              >
                {t('game.quitStay')}
              </button>
            </div>
          </div>
        </div>
      )}
      </OrientationGate>
    </div>
  );
}

/**
 * Id de quest_step pour p_answers. Convention seed : 6666…01/02/03 par palier.
 * En production l'app lira quest_steps_public ; pour la tranche verticale les
 * ids sont déterministes et embarqués dans le contenu.
 */
function stepIdForQuest(content: StationContent, tier: DifficultyTier): string {
  const suffix = { bronze: '01', silver: '02', gold: '03' }[tier];
  void content;
  return `66666666-6666-4666-8666-6666666666${suffix}`;
}
