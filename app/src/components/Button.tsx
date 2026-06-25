/**
 * BOUTON « PHYSIQUE » — composant signature (DA §2.3, backlog #1).
 * Volume (coin arrondi, ombre portée nette, liseré clair en haut → le bouton
 * « dépasse » et invite à être pressé), réaction d'enfoncement (translateY +
 * ombre qui se réduit) et retour multi-sensoriel (clack + haptique) à chaque
 * appui. Hiérarchie brutale : un seul `primary` visible à la fois.
 */
import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { tap } from '../lib/feedback';

// Fenêtre anti-« ghost touch » : un collégien ne clique pas, il spamme l'écran
// (DA Partie V, règle de Royal Match). On verrouille le double-déclenchement
// instantanément pour protéger la porte de score (fn_submit_attempt) des doubles
// soumissions, tout en gardant un retour visuel/sonore à chaque appui.
const GHOST_MS = 350;

type Variant = 'primary' | 'gold' | 'secondary' | 'tertiary';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Le bouton occupe toute la largeur (CTA héros). Défaut : true. */
  block?: boolean;
  children: ReactNode;
}

const SIZE: Record<Size, string> = {
  // cibles tactiles ≥ 56 px (loi UX #1) ; le hauteur vient du padding vertical
  sm: 'px-4 py-2.5 text-sm rounded-xl',
  md: 'px-5 py-3 text-base rounded-2xl',
  lg: 'px-6 py-4 text-lg rounded-2xl',
};

// volume = ombre portée + liseré clair en haut ; l'appui réduit l'ombre (enfoncement)
const VARIANT: Record<Variant, string> = {
  primary:
    'bg-email text-white font-display font-extrabold ' +
    'shadow-[0_5px_0_#073f6e,0_8px_18px_rgba(10,90,158,0.35)] ' +
    'ring-1 ring-inset ring-white/40 ' +
    'active:translate-y-[3px] active:shadow-[0_2px_0_#073f6e,0_3px_8px_rgba(10,90,158,0.3)]',
  gold:
    'bg-laiton text-encre font-display font-extrabold ' +
    'shadow-[0_5px_0_#86680f,0_8px_18px_rgba(201,162,39,0.35)] ' +
    'ring-1 ring-inset ring-white/40 ' +
    'active:translate-y-[3px] active:shadow-[0_2px_0_#86680f,0_3px_8px_rgba(201,162,39,0.3)]',
  secondary:
    'bg-plomb text-pierre font-display font-bold border border-rail ' +
    'shadow-[0_3px_0_var(--color-rail)] ' +
    'active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-rail)] active:bg-plomb-hi',
  tertiary:
    'bg-transparent text-pierre-dim font-medium ' +
    'active:text-pierre',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block = true, className = '', onClick, children, ...rest },
  ref,
) {
  const lastFire = useRef(0);
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      onClick={(e) => {
        const now = Date.now();
        // le retour sensoriel répond à CHAQUE tap (juice) ; l'action, une seule
        // fois par fenêtre (anti double-soumission)
        tap();
        if (now - lastFire.current < GHOST_MS) return;
        lastFire.current = now;
        onClick?.(e);
      }}
      className={[
        'inline-flex select-none items-center justify-center gap-2 tracking-tight',
        'transition-[transform,box-shadow,background-color] duration-75',
        'disabled:pointer-events-none disabled:opacity-50',
        block ? 'w-full' : '',
        SIZE[size],
        VARIANT[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});
