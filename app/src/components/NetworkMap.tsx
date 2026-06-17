import { useMemo } from 'react';
import { GEO_LINES, GEO_STATIONS, geoStation, linesAt, makeProjection } from '../lib/geo';

/**
 * LA CARTE — le réseau métro réel, projeté en SVG depuis les vraies coordonnées
 * IDFM (offline-first, zéro tuile externe). Les tracés relient les stations dans
 * l'ordre officiel ; les correspondances ressortent en pastilles claires. Les
 * lignes jouables sont mises en avant et tactiles (1-tap → conquête).
 */
interface Props {
  /** Codes des lignes jouables (mises en avant + tactiles). */
  playableCodes: Set<string>;
  onPickLine?: (code: string) => void;
  /** Facteur de zoom (1 = carte ajustée à la largeur ; >1 = on explore au scroll). */
  zoom?: number;
}

export function NetworkMap({ playableCodes, onPickLine, zoom = 1 }: Props) {
  const proj = useMemo(() => makeProjection(700), []);

  const linePaths = useMemo(
    () =>
      GEO_LINES.map((line) => ({
        line,
        pts: line.stops
          .map((slug) => {
            const s = geoStation(slug);
            if (!s) return null;
            const p = proj.project(s.lat, s.lon);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .filter((v): v is string => v !== null)
          .join(' '),
      })),
    [proj],
  );

  const hasFocus = playableCodes.size > 0;
  // ordre de rendu : lignes « à venir » dessous, ligne JOUABLE par-dessus (z-order)
  const ordered = useMemo(
    () => [...linePaths].sort(
      (a, b) => Number(playableCodes.has(a.line.code)) - Number(playableCodes.has(b.line.code)),
    ),
    [linePaths, playableCodes],
  );

  return (
    <svg
      viewBox={`0 0 ${proj.width} ${proj.height.toFixed(0)}`}
      className="block h-auto"
      style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
      role="img"
      aria-label="Carte géographique du réseau métro parisien"
    >
      <rect x="0" y="0" width={proj.width} height={proj.height} fill="#0d1726" />

      {/* Tracés des lignes (ordre officiel des stations).
          La ligne jouable RESSORT : trait épais + halo qui respire ; les lignes
          « à venir » s'effacent en arrière-plan (loi DA « un seul CTA évident »). */}
      {ordered.map(({ line, pts }) => {
        const playable = playableCodes.has(line.code);
        if (playable) {
          return (
            <g key={line.code}>
              {/* halo pulsé sous la ligne jouable */}
              <polyline
                points={pts} fill="none" stroke={line.color} strokeWidth={13}
                strokeLinejoin="round" strokeLinecap="round"
                className="animate-line-pulse"
              />
              <polyline
                points={pts} fill="none" stroke={line.color} strokeWidth={6}
                strokeLinejoin="round" strokeLinecap="round" opacity={1}
              />
            </g>
          );
        }
        return (
          <polyline
            key={line.code}
            points={pts}
            fill="none"
            stroke={line.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={hasFocus ? 0.3 : 1}
          />
        );
      })}

      {/* Stations (correspondances = pastilles claires plus grandes) */}
      {GEO_STATIONS.map((s) => {
        const p = proj.project(s.lat, s.lon);
        const interchange = linesAt(s.slug) > 1;
        return (
          <circle
            key={s.slug}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={interchange ? 3.2 : 2}
            fill={interchange ? '#fffdf7' : '#0d1726'}
            stroke={interchange ? '#0a1320' : '#8fa6bd'}
            strokeWidth={interchange ? 1.3 : 0.9}
          />
        );
      })}

      {/* Cibles tactiles : uniquement les lignes jouables (trait invisible épais) */}
      {linePaths
        .filter(({ line }) => playableCodes.has(line.code))
        .map(({ line, pts }) => (
          <polyline
            key={`hit-${line.code}`}
            points={pts}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            strokeLinejoin="round"
            strokeLinecap="round"
            pointerEvents="stroke"
            style={{ cursor: 'pointer' }}
            onClick={() => onPickLine?.(line.code)}
          >
            <title>{line.name}</title>
          </polyline>
        ))}
    </svg>
  );
}
