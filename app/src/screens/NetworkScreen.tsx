import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { getLineContent, LINE, NETWORK, type NetworkLine } from '../lib/content';
import { tap } from '../lib/feedback';
import { useArcadia } from '../store';

/**
 * LE RÉSEAU — le plateau de plus haut niveau (au-dessus d'une ligne).
 * Inspiration assumée : la carte-monde d'un Pokémon GO (on choisit son territoire)
 * + la signalétique du métro parisien (pastilles de ligne colorées, lecture
 * instantanée). On ne prétend PAS à une géo exacte tant que le pipeline GTFS IDFM
 * n'a pas peuplé stations + coordonnées : le bandeau est un schéma décoratif, la
 * navigation se fait par les pastilles de ligne (cibles tactiles ≥ 56 px).
 */

/** Nombre de stations conquises sur une ligne jouable (MVP : M1 seule a du contenu). */
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
  // conquête globale = stations conquises / stations jouables connues du réseau
  const totals = playableLines.reduce(
    (acc, l) => {
      const c = conqueredCount(l.code, tiersWon);
      return c ? { done: acc.done + c.done, total: acc.total + c.total } : acc;
    },
    { done: 0, total: 0 },
  );
  const heroLine = playableLines[0] ?? null;

  function openLine(line: NetworkLine) {
    if (line.status !== 'playable') return;
    tap();
    navigate(`/line/${line.code}`);
  }

  return (
    <div className="px-4 pb-8 pt-5">
      {/* ── En-tête réseau ── */}
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-email font-display text-lg font-extrabold text-white shadow-[0_4px_12px_rgba(10,90,158,0.35)]">
          ◉
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('network.title')}</h1>
          <p className="truncate text-xs text-pierre-dim">{t('network.subtitle', { city: NETWORK.city })}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-extrabold text-laiton">
            {totals.done}<span className="text-pierre-faint">/{totals.total}</span>
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-pierre-faint">{t('network.progress')}</p>
        </div>
      </header>

      {/* ── Bandeau schématique : faisceau de lignes colorées (décoratif) ── */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-rail bg-[#0d1726]">
        <svg viewBox="0 0 360 120" className="block h-auto w-full" aria-hidden>
          <rect width="360" height="120" fill="#0d1726" />
          {NETWORK.lines.slice(0, 8).map((l, i) => {
            const y = 18 + i * 12;
            return (
              <path
                key={l.code}
                d={`M -10 ${y} C 110 ${y + 30}, 250 ${y - 30}, 370 ${y + 8}`}
                fill="none" stroke={l.color} strokeWidth="3.5" strokeLinecap="round"
                opacity={l.status === 'playable' ? 1 : 0.55}
              />
            );
          })}
          {/* nœud central (correspondance) */}
          <circle cx="180" cy="60" r="9" fill="#fffdf7" stroke="#0a5a9e" strokeWidth="3" />
        </svg>
      </div>

      {/* ── Reprends ta conquête : 1-tap vers la ligne jouable ── */}
      {heroLine && (() => {
        const c = conqueredCount(heroLine.code, tiersWon);
        return (
          <button
            type="button"
            onClick={() => openLine(heroLine)}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-email p-4 text-left text-white shadow-[0_6px_0_#073f6e,0_10px_22px_rgba(10,90,158,0.3)] ring-2 ring-white/80 ring-inset transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_3px_0_#073f6e]"
          >
            <LineBadge line={heroLine} size={52} />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-laiton-clair">
                ★ {t('network.heroKicker')}
              </span>
              <span className="block truncate font-display text-lg font-extrabold">{LINE.name}</span>
              <span className="block truncate text-[11px] text-white/75">{heroLine.termini}</span>
            </span>
            <span className="flex-none rounded-lg bg-laiton px-3 py-1.5 font-display text-xs font-extrabold text-encre">
              {c && c.done > 0 ? t('network.resume') : t('network.start')}
            </span>
          </button>
        );
      })()}

      {/* ── Tout le réseau ── */}
      <h2 className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-pierre-faint">{t('network.all')}</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {NETWORK.lines.map((line) => {
          const c = conqueredCount(line.code, tiersWon);
          const playable = line.status === 'playable';
          return (
            <li key={line.code}>
              <button
                type="button"
                disabled={!playable}
                onClick={() => openLine(line)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                  playable ? 'border-rail bg-plomb active:bg-plomb-hi' : 'border-rail/60 bg-craie-2 opacity-70'
                }`}
              >
                <LineBadge line={line} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-extrabold text-pierre">{line.name}</span>
                  <span className="block truncate text-[11px] text-pierre-faint">{line.termini}</span>
                </span>
                {playable ? (
                  <span className="flex-none text-right">
                    {c && (
                      <span className="block font-display text-sm font-extrabold text-laiton">
                        {c.done}<span className="text-pierre-faint">/{c.total}</span>
                      </span>
                    )}
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-email">{t('network.enter')} ›</span>
                  </span>
                ) : (
                  <span className="flex-none font-mono text-[9px] uppercase tracking-wider text-pierre-faint">
                    🔒 {t('network.soon')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-center font-mono text-[10px] leading-relaxed text-pierre-faint/80">
        {t('network.footnote')}
      </p>
    </div>
  );
}
