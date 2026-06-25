/**
 * LA MASCOTTE — « le poinçonneur », notre souris parisienne contrôleuse de billets
 * (rendu 3D premium, esprit Ratatouille). Le visage de la marque : guide la FTUE,
 * célèbre les victoires/séries, habite les états vides. L'image porte un fond
 * crème qui se fond sur les surfaces claires (craie/plomb) de la DA « Métro Clair ».
 */
interface Props {
  size?: number;
  className?: string;
  alt?: string;
}

export function Mascotte({ size = 120, className = '', alt = 'Le poinçonneur, guide d’Arcadia' }: Props) {
  return (
    <img
      src="/mascotte/poinconneur.png"
      width={size}
      height={size}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
