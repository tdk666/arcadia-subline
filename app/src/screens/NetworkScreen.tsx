import { Suspense, lazy, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { getLineContent, LINE, NETWORK, type NetworkLine } from '../lib/content';
import { DailyObjective } from '../components/DailyObjective';
import { tap } from '../lib/feedback';
import { useArcadia } from '../store';

/**
 * LE RÉSEAU — l'accueil. La carte EST l'app (Pokémon GO / Citymapper) : un vrai
 * moteur WebGL (MapLibre, cf. MapView) en plein écran, chargé en lazy. Par-dessus,
 * l'objectif du jour (habitude) et le CTA héros « ta ligne » (1-tap-to-play).
 */
const MapView = lazy(() => import('../components/MapView').then((m) => ({ default: m.MapView })));

function conqueredCount(code: string, tiersWon: Record<string, string[]>): { done: number; total: number } | null {
  const content = getLineContent(code);
  if (!content) return null;
  const done = content.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;
  return { done, total: content.stations.length };
}

/** Pastille de ligne « émaillée » (le code dans un disque coloré, façon plan métro). */
function LineBadge({ line, size = 44 }: { line: NetworkLine; size?: number }) {
  const label = line.code.replace('M', '').toUpperCase();
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-display font-extrabold text-encre"
      style={{
        width: size, height: size, background: line.color,
        fontSize: size * 0.4,
        boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -3px 5px rgba(0,0,0,0.22), 0 2px 5px rgba(0,0,0,0.25)',
      }}
    >
      {label}
    </span>
  );
}

export function NetworkScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tiersWon = useArcadia((s) => s.tiersWon);

  const playableLines = NETWORK.lines.filter((l) => l.status === 'playable');
  const totals = playableLines.reduce(
    (acc, l) => {
      const c = conqueredCount(l.code, tiersWon);
      return c ? { done: acc.done + c.done, total: acc.total + c.total } : acc;
    },
    { done: 0, total: 0 },
  );
  const heroLine = playableLines[0] ?? null;
  const playableCodes = useMemo(
    () => new Set(NETWORK.lines.filter((l) => l.status === 'playable').map((l) => l.code)),
    [],
  );

  function openLineByCode(code: string) {
    const line = NETWORK.lines.find((l) => l.code === code);
    if (line && line.status === 'playable') { tap(); navigate(`/line/${code}`); }
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── En-tête compact + objectif du jour (fixes) ── */}
      <div className="px-4 pt-3">
        <header className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold tracking-tight">{t('network.title')}</h1>
            <p className="truncate text-[11px] text-pierre-dim">{t('network.subtitle', { city: NETWORK.city })}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-base font-extrabold text-laiton">
              {totals.done}<span className="text-pierre-faint">/{totals.total}</span>
            </p>
            <p className="font-mono text-[8px] uppercase tracking-widest text-pierre-faint">{t('network.progress')}</p>
          </div>
        </header>
        <DailyObjective />
      </div>

      {/* ── LA CARTE plein écran (WebGL réel) + CTA héros flottant ── */}
      <div className="relative mt-2 min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-[#0d1726] font-mono text-xs text-pierre-faint/70">
              {t('common.loading')}
            </div>
          }
        >
          <MapView playableCodes={playableCodes} onPickLine={openLineByCode} />
        </Suspense>

        {heroLine && (() => {
          const c = conqueredCount(heroLine.code, tiersWon);
          return (
            <button
              type="button"
              onClick={() => openLineByCode(heroLine.code)}
              className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-email/95 p-3 text-left text-white shadow-[0_6px_0_#073f6e,0_10px_22px_rgba(10,90,158,0.35)] ring-2 ring-white/80 ring-inset backdrop-blur transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_3px_0_#073f6e]"
            >
              <LineBadge line={heroLine} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-laiton-clair">
                  ★ {t('network.heroKicker')}
                </span>
                <span className="block truncate font-display text-base font-extrabold">{LINE.name}</span>
              </span>
              <span className="flex-none rounded-lg bg-laiton px-3 py-1.5 font-display text-xs font-extrabold text-encre">
                {c && c.done > 0 ? t('network.resume') : t('network.start')}
              </span>
            </button>
          );
        })()}
      </div>
    </div>
  );
}
