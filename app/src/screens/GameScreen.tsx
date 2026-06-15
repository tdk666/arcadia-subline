import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getGame, TIER_ORDER,
  type DifficultyTier, type GameProps, type GameResult,
} from '@arcadia/games';
import { pickText, useI18n } from '../i18n';
import { backend } from '../lib/backend';
import { getStationContent, type StationContent } from '../lib/content';
import { previewDemolitionScore } from '../lib/scoring';
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

  // brief → play → submitting → result ; runId force un moteur neuf au rejouer
  const [phase, setPhase] = useState<'brief' | 'play' | 'submitting' | 'result'>('brief');
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<LastResult | null>(null);
  const [quitAsk, setQuitAsk] = useState(false);

  const allowed = !!content && isTierUnlocked(slug, difficulty);

  // redirection HORS rendu (la naviguer pendant le rendu casse React Router)
  useEffect(() => {
    if (!allowed) navigate(`/station/${slug}`, { replace: true });
  }, [allowed, navigate, slug]);

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
  const params = quest.params as Record<string, number>;

  async function onFinish(gameResult: GameResult) {
    const c = content as StationContent;
    // p_answers : { "<quest_step_id>": télémétrie } — le serveur note, jamais nous
    const stepId = stepIdForQuest(c, difficulty);
    const answers = { [stepId]: gameResult.answers };

    setPhase('submitting');
    let r: LastResult;
    if (backend.mode === 'demo' || user) {
      try {
        const server = await backend.submitAttempt(quest.questId, answers, gameResult.durationMs);
        r = { ...server, slug: c.slug, tier: difficulty, localOnly: false };
      } catch (e) {
        console.warn('submitAttempt:', e);
        // panne réseau/serveur : aperçu local + mise en file (rejouée plus tard)
        r = {
          ...previewDemolitionScore(quest.params, difficulty, gameResult.answers, gameResult.durationMs),
          slug: c.slug, tier: difficulty, localOnly: true,
        };
        if (r.success) queuePending({ questId: quest.questId, slug: c.slug, tier: difficulty, answers, durationMs: gameResult.durationMs });
      }
    } else {
      // invité (mode Supabase) : aperçu local, la tentative gagnante est mise en
      // file et soumise via fn_submit_attempt dès la création du compte
      r = {
        ...previewDemolitionScore(quest.params, difficulty, gameResult.answers, gameResult.durationMs),
        slug: c.slug, tier: difficulty, localOnly: true,
      };
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
            <p className="mt-1.5 text-sm font-semibold text-pierre">
              ⚜ {t('brief.objectiveText', { targets: 3 })}
              {params.targetPct > 0 && <><br />💥 {t('brief.objectiveExtra', { pct: params.targetPct })}</>}
              {params.timeLimitS > 0 && <><br />⏱ {t('brief.objectiveTime', { time: params.timeLimitS })}</>}
              <br />🪨 {t('brief.objectiveAmmo', { n: params.maxShots })}
            </p>
            <p className="mt-2 border-t border-rail pt-2 font-mono text-[10px] leading-relaxed text-pierre-faint">
              {t('brief.howto')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => { tap(); track('game_start', { slug, tier: difficulty }); setPhase('play'); }}
            className="animate-pop w-full max-w-xs rounded-2xl py-4 font-display text-lg font-extrabold text-encre shadow-[0_5px_0_rgba(0,0,0,0.22),0_0_30px_rgba(242,194,0,0.35)] ring-1 ring-inset ring-white/40 transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_2px_0_rgba(0,0,0,0.22),0_0_20px_rgba(242,194,0,0.3)]"
            style={{ background: TIER_COLOR[difficulty], animationDelay: '0.25s' }}
          >
            ⚔ {t('brief.cta')}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/station/${slug}`)}
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
              params: quest.params,
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
