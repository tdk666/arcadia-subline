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
}

export function NetworkMap({ playableCodes, onPickLine }: Props) {
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

  return (
    <svg
      viewBox={`0 0 ${proj.width} ${proj.height.toFixed(0)}`}
      className="block h-auto w-full"
      role="img"
      aria-label="Carte géographique du réseau métro parisien"
    >
      <rect x="0" y="0" width={proj.width} height={proj.height} fill="#0d1726" />

      {/* Tracés des lignes (ordre officiel des stations) */}
      {linePaths.map(({ line, pts }) => (
        <polyline
          key={line.code}
          points={pts}
          fill="none"
          stroke={line.color}
          strokeWidth={playableCodes.has(line.code) ? 5.5 : 3.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={!hasFocus || playableCodes.has(line.code) ? 1 : 0.8}
        />
      ))}

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
