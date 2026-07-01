/**
 * ICÔNES DA des mini-jeux — même langage que `app/src/components/icons.tsx`
 * (pictogramme métro : géométrique, mono-sens, `currentColor`). Le package
 * games ne dépend pas de l'app : ce mini-set remplace les emojis système
 * (❤️ 🔊 🔥 ⏱…) bannis des écrans signature (invariant zéro-emoji).
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps) {
  return {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true, ...rest,
  } as const;
}

/** Cœur — une vie. `off` = vie perdue (contour éteint). */
export function IconHeart({ off = false, ...p }: IconProps & { off?: boolean }) {
  return (
    <svg {...base(p)}>
      <path
        d="M12 20 C6 15.5 3.5 12.5 3.5 9.2 A4.5 4.5 0 0 1 12 6.8 A4.5 4.5 0 0 1 20.5 9.2 C20.5 12.5 18 15.5 12 20 Z"
        fill={off ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={off ? 1.6 : 0}
        opacity={off ? 0.3 : 1}
      />
    </svg>
  );
}

/** Haut-parleur — son actif / coupé (barre oblique). */
export function IconSound({ off = false, ...p }: IconProps & { off?: boolean }) {
  return (
    <svg {...base(p)}>
      <path d="M4 9.5 H7.5 L12.5 5.5 V18.5 L7.5 14.5 H4 Z" fill="currentColor" />
      {off
        ? <path d="M15.5 9.5 L20 14.5 M20 9.5 L15.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        : <path d="M15.5 9 A4.2 4.2 0 0 1 15.5 15 M17.5 6.8 A7.4 7.4 0 0 1 17.5 17.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

/** Chrono — temps limité. */
export function IconClock(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="13" r="7.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 13 V8.5 M12 13 L15 15 M9.5 3.5 H14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Flamme — la série (streak). */
export function IconFlame(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 C13 6 16 7.5 16 11.5 A4 4 0 0 1 8 11.5 C8 9.5 9 8.5 9.5 8 C10 9.5 11 9.5 11 8 C11 6 12 5 12 3 Z" fill="currentColor" />
    </svg>
  );
}

/** Souffle — explosion / dégâts de zone. */
export function IconBlast(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 L13.6 8.2 L19 6.5 L15.8 11 L21 12.8 L15.6 14 L17.8 19 L12.8 15.9 L10.5 21 L9.6 15.4 L4.5 17.4 L7.8 13 L3 11 L8.6 10 L6.5 5 L11 8 Z" fill="currentColor" />
    </svg>
  );
}

/** Baril de poudre — cerclé, mèche allumée. */
export function IconKeg(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="7" y="7" width="10" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11 H17 M7 16 H17" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.6" />
      <path d="M12 7 C12 5 13.5 4.8 14 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14.6" cy="2.8" r="1.2" fill="currentColor" />
    </svg>
  );
}
