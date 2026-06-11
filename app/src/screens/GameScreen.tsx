import { Suspense, lazy, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getGame, TIER_ORDER,
  type DifficultyTier, type GameProps, type GameResult,
} from '@arcadia/games';
import { useI18n } from '../i18n';
import { backend } from '../lib/backend';
import { getStationContent, type StationContent } from '../lib/content';
import { previewDemolitionScore } from '../lib/scoring';
import { useArcadia, type LastResult } from '../store';
import { ResultView } from '../components/ResultView';

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

  const [phase, setPhase] = useState<'play' | 'submitting' | 'result'>('play');
  const [result, setResult] = useState<LastResult | null>(null);
  const [quitAsk, setQuitAsk] = useState(false);

  const Game = useMemo(() => {
    if (!content) return null;
    const def = getGame(content.game.archetype);
    return lazy(def.load) as React.ComponentType<GameProps>;
  }, [content]);

  if (!content || !Game || !isTierUnlocked(slug, difficulty)) {
    navigate(`/station/${slug}`, { replace: true });
    return null;
  }

  const quest = content.quests[difficulty];

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
  }

  return (
    <div className="fixed inset-0 bg-tunnel">
      {phase !== 'result' && (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center font-mono text-sm text-neon-faint">
              {t('common.loading')}
            </div>
          }
        >
          <Game
            ctx={{
              questId: quest.questId,
              stationId: content.stationId,
              stationSlug: content.slug,
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-sm text-cyan-metro">
          {t('game.submitting')}
        </div>
      )}

      {phase === 'result' && result && (
        <ResultView result={result} stationName={content.name} />
      )}

      {quitAsk && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-8">
          <div className="animate-pop w-full max-w-xs rounded-2xl border border-rail bg-quai p-5 text-center">
            <p className="font-display font-bold">{t('game.quit')}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-rail py-2.5 text-sm text-neon-dim active:bg-quai-hi"
                onClick={() => navigate(`/station/${slug}`)}
              >
                {t('game.quitConfirm')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gold-metro py-2.5 font-bold text-sm text-tunnel active:scale-[0.98]"
                onClick={() => setQuitAsk(false)}
              >
                {t('game.quitStay')}
              </button>
            </div>
          </div>
        </div>
      )}
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
