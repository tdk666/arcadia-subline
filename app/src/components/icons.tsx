/**
 * SYSTÈME D'ICÔNES — set unique, mono-sens, inspiré du pictogramme métro
 * (géométrique, lisible à bout de bras). Remplace les emojis système hétérogènes
 * (◉❖♛◈🔒) pour une DA cohérente. Toutes en 24×24, `currentColor`, taille pilotée
 * par la prop `size`. Trait = 2 (réglé pour rester net en petit).
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps) {
  return {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true, ...rest,
  };
}

/** Réseau — graphe de stations reliées (l'identité du plateau). */
export function IconNetwork(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 19 L11 12 L14 15 L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="19" r="2.1" fill="currentColor" />
      <circle cx="11" cy="12" r="2.1" fill="currentColor" />
      <circle cx="14" cy="15" r="2.1" fill="currentColor" />
      <circle cx="19" cy="6" r="2.1" fill="currentColor" />
    </svg>
  );
}

/** Collection — carte d'archive (mémoire de Paris) avec coin scellé. */
export function IconCollection(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9 H16 M8 13 H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Ligue / classement — coupe de tournoi. */
export function IconLeague(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 4 H17 V8 A5 5 0 0 1 7 8 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 5 H4 V6.5 A3 3 0 0 0 7 9.5 M17 5 H20 V6.5 A3 3 0 0 1 17 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13 V16 M9 20 H15 M10 20 Q10 17 12 16 Q14 17 14 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Profil — buste dans la rondelle (pictogramme universel). */
export function IconProfile(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="9" r="3.4" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 19 A6.5 6.5 0 0 1 18.5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Saison / Pass — billet de métro poinçonné. */
export function IconSeason(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7 V17 M12 7 V17" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5 2.5" strokeLinecap="round" />
      <circle cx="16.5" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Flamme — le streak (habitude quotidienne). Pleine pour « lire » de loin. */
export function IconFlame(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 C13 6 16 7.5 16 11.5 A4 4 0 0 1 8 11.5 C8 9.5 9 8.5 9.5 8 C10 9.5 11 9.5 11 8 C11 6 12 5 12 3 Z" fill="currentColor" />
    </svg>
  );
}

/** Étoile pleine — récompense / palier gagné. */
export function IconStar(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.5 L14.6 9 L20.5 9.7 L16.2 13.8 L17.3 19.6 L12 16.8 L6.7 19.6 L7.8 13.8 L3.5 9.7 L9.4 9 Z" fill="currentColor" />
    </svg>
  );
}

/** Jeton — la monnaie du jeu (pièce frappée façon jeton de métro). */
export function IconToken(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#15110c" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M12 8.5 V15.5 M9.2 12 H14.8" stroke="#15110c" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Cadenas — contenu verrouillé. */
export function IconLock(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="10" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10 V7.5 A4 4 0 0 1 16 7.5 V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
