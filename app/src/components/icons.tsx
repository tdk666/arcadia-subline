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

/** Lecture — triangle « jouer » (palier disponible). */
export function IconPlay(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M8.5 5.5 L18 12 L8.5 18.5 Z" fill="currentColor" />
    </svg>
  );
}

/** Sceau d'archive — cachet frappé (la mémoire de Paris) ; remplace toute
 *  fleur-de-lys (bannie de la marque). */
export function IconSeal(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.4 2" />
      <path d="M12 9.2 V14.8 M9.4 12 H14.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Couronne — les titres (Chef de Station → Empereur). */
export function IconCrown(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 17 L5.5 8.5 L9.5 12.5 L12 6.5 L14.5 12.5 L18.5 8.5 L20 17 Z" fill="currentColor" />
    </svg>
  );
}

/** Rejouer — flèche circulaire (remettre le défi en jeu). */
export function IconReplay(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M18.5 12 A6.5 6.5 0 1 1 12 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2.5 L16 5.5 L12 8.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Partager — flèche qui sort du cadre (la conquête se montre). */
export function IconShare(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 14 V4 M8.5 7 L12 3.5 L15.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11 H5 V20 H19 V11 H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Monter — palier suivant. */
export function IconAscend(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 19 V6 M6.5 11.5 L12 5.5 L17.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Cœur — les vies (quiz). */
export function IconHeart(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 20 C6 15.5 3.5 12.5 3.5 9.2 A4.5 4.5 0 0 1 12 6.8 A4.5 4.5 0 0 1 20.5 9.2 C20.5 12.5 18 15.5 12 20 Z" fill="currentColor" />
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

/** Souffle — explosion / dégâts de zone (barils, destruction). */
export function IconBlast(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 L13.6 8.2 L19 6.5 L15.8 11 L21 12.8 L15.6 14 L17.8 19 L12.8 15.9 L10.5 21 L9.6 15.4 L4.5 17.4 L7.8 13 L3 11 L8.6 10 L6.5 5 L11 8 Z" fill="currentColor" />
    </svg>
  );
}

/** Pavé — la munition du peuple (démolition). */
export function IconPave(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="6" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12 H20 M12 6 V18" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
    </svg>
  );
}

/** Étendard royal — la cible à abattre. */
export function IconStandard(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 3 V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 4.5 H18.5 L14.5 8.5 L18.5 12.5 H6 Z" fill="currentColor" />
    </svg>
  );
}

/** Bouclier — le gardien (palier Or tenu). */
export function IconShield(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 L19 6 V11.5 C19 16 16 19.5 12 21 C8 19.5 5 16 5 11.5 V6 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 7.5 V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Icône d'un haut fait — mapping clé → pictogramme du système (jamais d'emoji). */
export function AchievementIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  switch (icon) {
    case 'pave': return <IconPave size={size} />;
    case 'seal': return <IconSeal size={size} />;
    case 'shield': return <IconShield size={size} />;
    case 'flame': return <IconFlame size={size} />;
    case 'token': return <IconToken size={size} />;
    case 'network': return <IconNetwork size={size} />;
    default: return <IconStar size={size} />;
  }
}
