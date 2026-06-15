import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pickText, useI18n } from '../i18n';
import { getStationContent, isPlayable, LINE } from '../lib/content';
import { tap } from '../lib/feedback';
import { useArcadia } from '../store';

const TIERS = ['bronze', 'silver', 'gold'] as const;

/**
 * LE PLATEAU DE CONQUÊTE — la ligne 1 comme une carte VIVANTE (façon Pokémon GO).
 * Tracé géographique d'ouest en est, la Seine qui coule, des repères parisiens,
 * une rame qui glisse sur la ligne, des halos de territoire qui respirent, et un
 * PHARE d'explorateur posé sur ta prochaine conquête. Chaque station en médaillon :
 * conquise = territoire illuminé, à conquérir = sceau d'ambre qui pulse.
 */

const NODE_DX = 132;        // espacement horizontal entre stations
const PAD_X = 80;
const MID_Y = 190;
const AMP = 46;             // amplitude de l'ondulation du tracé

// repères parisiens posés près de leur station (glyphe + station index)
const LANDMARKS: { i: number; glyph: string; label: string }[] = [
  { i: 6, glyph: '⌂', label: 'Arc de Triomphe' },
  { i: 12, glyph: '▣', label: 'Louvre' },
  { i: 14, glyph: '†', label: 'Notre-Dame' },
  { i: 17, glyph: '⚑', label: 'Colonne de Juillet' },
];

function nodePos(i: number) {
  return { x: PAD_X + i * NODE_DX, y: MID_Y + Math.sin(i * 0.62) * AMP };
}

export function LineMapScreen() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const tiersWon = useArcadia((s) => s.tiersWon);
  const user = useArcadia((s) => s.user);
  const scroller = useRef<HTMLDivElement>(null);

  const conquered = LINE.stations.filter((s) => (tiersWon[s.slug] ?? []).length > 0).length;
  const pct = Math.round((conquered / LINE.stations.length) * 100);
  const heroIndex = LINE.stations.findIndex(
    (s) => isPlayable(s.slug) && (tiersWon[s.slug] ?? []).length < 3,
  );
  const hero = heroIndex >= 0 ? getStationContent(LINE.stations[heroIndex].slug) : null;
  // 1-tap-to-play (loi UX #2) : le défi du jour lance directement le prochain
  // palier non gagné (gating séquentiel → c'est le 1er palier débloqué restant).
  const heroNextTier = hero
    ? (TIERS.find((tr) => !(tiersWon[hero.slug] ?? []).includes(tr)) ?? 'bronze')
    : 'bronze';

  function playHero() {
    if (!hero) return;
    tap();
    navigate(`/play/${hero.slug}/${heroNextTier}`);
  }

  const W = PAD_X * 2 + (LINE.stations.length - 1) * NODE_DX;
  const H = 380;
  const linePath = LINE.stations
    .map((_, i) => { const p = nodePos(i); return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`; })
    .join(' ');
  // portion conquise du tracé (jusqu'à la dernière station gagnée)
  const lastWon = LINE.stations.reduce((acc, s, i) => ((tiersWon[s.slug] ?? []).length ? i : acc), -1);
  const wonPath = lastWon >= 0
    ? LINE.stations.slice(0, lastWon + 1).map((_, i) => { const p = nodePos(i); return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`; }).join(' ')
    : '';
  const seinePath = `M 0 ${H * 0.74} C ${W * 0.25} ${H * 0.6}, ${W * 0.45} ${H * 0.9}, ${W * 0.62} ${H * 0.72} S ${W * 0.9} ${H * 0.6}, ${W} ${H * 0.78}`;

  return (
    <div className="flex h-full flex-col">
      {/* ── En-tête + jauge (fixe) ── */}
      <div className="px-4 pt-5">
        <header className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold text-encre shadow-[0_0_18px_rgba(201,162,39,0.35)]"
            style={{ background: LINE.color }}
          >
            1
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('map.title')}</h1>
            <p className="truncate text-xs text-pierre-dim">{t('map.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-extrabold text-laiton">{pct}%</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-pierre-faint">{t('map.progress')}</p>
          </div>
        </header>
      </div>

      {/* ── LE PLATEAU défilable ── */}
      <div ref={scroller} className="relative mt-3 min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block h-full">
          <defs>
            <linearGradient id="board-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbf7ec" />
              <stop offset="1" stopColor="#efe6d2" />
            </linearGradient>
            <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#cdbf9c" />
              <stop offset="1" stopColor="#d8cdb4" />
            </linearGradient>
            <radialGradient id="lamp-pool">
              <stop offset="0" stopColor="#0a5a9e" stopOpacity="0.07" />
              <stop offset="1" stopColor="#0a5a9e" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="avatar-medal">
              <stop offset="0" stopColor="#fbe9a6" />
              <stop offset="0.55" stopColor="#e3c463" />
              <stop offset="1" stopColor="#9c7d18" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#board-bg)" />

          {/* flaques de lumière de réverbère (atmosphère du faubourg) */}
          {LANDMARKS.map((lm) => {
            const p = nodePos(lm.i);
            return <circle key={`pool-${lm.i}`} cx={p.x} cy={p.y} r="120" fill="url(#lamp-pool)" />;
          })}

          {/* la Seine : ruban translucide + filet qui COULE (tirets animés) */}
          <path
            d={`${seinePath} L ${W} ${H} L 0 ${H} Z`}
            fill="#0a5a9e" opacity="0.14"
          />
          <path d={seinePath} fill="none" stroke="#3f86c4" strokeWidth="1.5" opacity="0.3" />
          <path d={seinePath} fill="none" stroke="#7db4e0" strokeWidth="1.6" opacity="0.55" className="animate-seine" />

          {/* repères parisiens (glyphes ambre discrets au-dessus de leur station) */}
          {LANDMARKS.map((lm) => {
            const p = nodePos(lm.i);
            return (
              <g key={lm.label} opacity="0.82">
                <text x={p.x} y={p.y - 64} textAnchor="middle" fontSize="26" fill="#9c7d18">{lm.glyph}</text>
                <text x={p.x} y={p.y - 48} textAnchor="middle" fontSize="9" fill="#6b5f48"
                  fontFamily="'Work Sans',sans-serif">{lm.label}</text>
              </g>
            );
          })}

          {/* tracé de la ligne : gris chaud, puis portion conquise en or lumineux */}
          <path id="lineTrace" d={linePath} fill="none" stroke="url(#line-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {wonPath && (
            <path d={wonPath} fill="none" stroke={LINE.color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 6px rgba(242,194,0,0.6))' }} />
          )}

          {/* RAME qui glisse sur toute la ligne (le réseau est vivant) */}
          <g>
            <g>
              <rect x="-13" y="-5" width="26" height="10" rx="4" fill="#0a5a9e" stroke="#073f6e" strokeWidth="1.4" />
              <rect x="-9" y="-2.5" width="6" height="5" rx="1" fill="#fbf7ec" opacity="0.95" />
              <rect x="3" y="-2.5" width="6" height="5" rx="1" fill="#fbf7ec" opacity="0.95" />
              <circle cx="13" cy="0" r="2.4" fill="#e3c463" />
              <animateMotion dur="20s" repeatCount="indefinite" rotate="auto">
                <mpath href="#lineTrace" />
              </animateMotion>
            </g>
          </g>

          {/* terminus ouest/est */}
          {[0, LINE.stations.length - 1].map((i) => {
            const p = nodePos(i);
            return <circle key={i} cx={p.x} cy={p.y} r="11" fill="none" stroke="#8a7c63" strokeWidth="3" />;
          })}

          {/* stations : médaillons */}
          {LINE.stations.map((station, i) => {
            const p = nodePos(i);
            const won = (tiersWon[station.slug] ?? []).length > 0;
            const fullyWon = (tiersWon[station.slug] ?? []).length >= 3;
            const playable = isPlayable(station.slug);
            const labelBelow = i % 2 === 0;
            return (
              <g
                key={station.slug}
                style={{ cursor: playable ? 'pointer' : 'default' }}
                onClick={() => playable && navigate(`/station/${station.slug}`)}
              >
                {/* halo de territoire conquis qui RESPIRE */}
                {won && <circle cx={p.x} cy={p.y} r="24" fill={LINE.color} className="animate-map-pulse" />}
                <circle
                  cx={p.x} cy={p.y} r="12"
                  fill={won ? LINE.color : playable ? '#fffdf7' : '#e4dcc8'}
                  stroke={won ? '#1f1812' : playable ? '#0a5a9e' : '#bcae90'}
                  strokeWidth={playable ? 3 : 2}
                  style={won ? { filter: 'drop-shadow(0 0 7px rgba(242,194,0,0.55))' } : undefined}
                />
                {fullyWon && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="13" fill="#15110c">★</text>}
                {!won && playable && <circle cx={p.x} cy={p.y} r="3.5" fill="#0a5a9e" />}

                {/* étiquette */}
                <text
                  x={p.x} y={labelBelow ? p.y + 30 : p.y - 22}
                  textAnchor="middle" fontSize="11"
                  fill={playable ? '#2a2118' : '#9c8f76'}
                  fontFamily="'Work Sans',sans-serif"
                  fontWeight={playable ? 600 : 400}
                >
                  {station.name.length > 16 ? station.name.slice(0, 15) + '…' : station.name}
                </text>
                {playable && !won && (
                  <text x={p.x} y={labelBelow ? p.y + 43 : p.y - 35} textAnchor="middle" fontSize="8"
                    fill="#0a5a9e" fontFamily="'Work Sans',sans-serif" letterSpacing="1">
                    {t('map.challengeAvailable').toUpperCase()}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── PHARE D'EXPLORATEUR : posé sur ta prochaine conquête (le « toi ») ── */}
          {hero && heroIndex >= 0 && (() => {
            const p = nodePos(heroIndex);
            return (
              <g
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/station/${hero.slug}`)}
              >
                {/* aura au sol qui pulse */}
                <circle cx={p.x} cy={p.y} r="30" fill="#e0964a" className="animate-map-pulse" />
                <circle cx={p.x} cy={p.y} r="19" fill="none" stroke="#0a5a9e" strokeWidth="2.5" className="animate-glow" />
                {/* médaillon flottant de l'explorateur (bobbing) */}
                <g className="animate-map-bob">
                  <ellipse cx={p.x} cy={p.y - 8} rx="9" ry="3" fill="#000" opacity="0.3" />
                  <g transform={`translate(${p.x}, ${p.y - 40})`}>
                    {/* pointe vers la station */}
                    <path d="M -6 14 L 0 24 L 6 14 Z" fill="#9c7d18" />
                    <circle r="15" fill="url(#avatar-medal)" stroke="#fff6d0" strokeWidth="2" />
                    {/* silhouette du voyageur */}
                    <circle cy="-3.5" r="4" fill="#15110c" />
                    <path d="M -7 8 C -7 1 7 1 7 8 Z" fill="#15110c" />
                  </g>
                </g>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* ── Carte-héros : le défi du jour appelle à l'assaut (fixe en bas) ──
          1-tap-to-play : la carte ENTIÈRE lance la partie ; un lien discret mène
          au détail de la station pour qui veut le contexte. */}
      {hero && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={playHero}
            className="relative block w-full overflow-hidden rounded-2xl bg-email p-4 text-left text-white shadow-[0_6px_0_#073f6e,0_10px_22px_rgba(10,90,158,0.3)] ring-2 ring-white/80 ring-inset transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_3px_0_#073f6e,0_5px_12px_rgba(10,90,158,0.3)]"
          >
            <div className="pointer-events-none absolute -right-6 -top-8 text-[88px] text-white opacity-15">⚑</div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-laiton-clair">★ {t('map.heroKicker')}</p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-white">
              {pickText(hero.game.title, locale)}
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1.5">
                {TIERS.map((tr) => (
                  <span key={tr} className={`h-2.5 w-2.5 rounded-full border ${
                    (tiersWon[hero.slug] ?? []).includes(tr)
                      ? 'border-laiton bg-laiton shadow-[0_0_6px_rgba(242,194,0,0.7)]'
                      : 'border-white/45'
                  }`} />
                ))}
              </div>
              <span className="rounded-lg bg-laiton px-3.5 py-1.5 font-display text-xs font-extrabold text-encre">
                ⚔ {t('map.heroCta')}
              </span>
            </div>
          </button>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/station/${hero.slug}`)}
              className="font-mono text-[11px] text-pierre-faint underline-offset-2 active:text-pierre-dim active:underline"
            >
              {hero.name} ›
            </button>
            {!user && (
              <span className="font-mono text-[11px] text-pierre-faint">· {t('map.playWithoutAccount')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
