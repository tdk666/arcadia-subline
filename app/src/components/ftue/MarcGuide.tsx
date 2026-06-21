/**
 * MARC — guide animé de la FTUE « L'Émergence ».
 * DROP-IN RIVE : si /mascotte/marc.riv existe, on pilote « Marc » via le CONTRAT
 * D'INPUTS (entree/salut/pointe/acquiesce/reconforte/celebre + parle).
 *
 * Rive migre des « state machine inputs » (legacy) vers le « data binding /
 * view models ». On supporte LES DEUX : le code déclenche d'abord l'input de
 * state machine s'il existe, sinon la propriété de view model (même nom). Ainsi
 * le .riv marche qu'il ait été monté à l'ancienne OU en data binding.
 * Cf. brain/marc-rive-agent-prompt.md.
 */
import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

export type MarcState =
  | 'idle' | 'entree' | 'salut' | 'pointe' | 'acquiesce' | 'reconforte' | 'celebre';

export function MarcGuide({
  state = 'idle', speaking = false, size = 180, className = '',
}: { state?: MarcState; speaking?: boolean; size?: number; className?: string }) {
  const [riveOk, setRiveOk] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: '/mascotte/marc.riv',
    stateMachines: 'Marc',
    autoplay: true,
    autoBind: true, // lie l'instance de view model par défaut (si Marc est en data binding)
    onLoad: () => setRiveOk(true),
    onLoadError: () => setRiveOk(false),
  });

  // chemin "legacy" : state machine inputs (null si le .riv est en data binding)
  const entree = useStateMachineInput(rive, 'Marc', 'entree');
  const salut = useStateMachineInput(rive, 'Marc', 'salut');
  const pointe = useStateMachineInput(rive, 'Marc', 'pointe');
  const acquiesce = useStateMachineInput(rive, 'Marc', 'acquiesce');
  const reconforte = useStateMachineInput(rive, 'Marc', 'reconforte');
  const celebre = useStateMachineInput(rive, 'Marc', 'celebre');
  const parleInput = useStateMachineInput(rive, 'Marc', 'parle');

  // déclenche un état : input de state machine OU trigger de view model (selon le .riv)
  useEffect(() => {
    if (!riveOk) return;
    const sm: Record<string, { fire?: () => void } | null> = {
      entree, salut, pointe, acquiesce, reconforte, celebre,
    };
    sm[state]?.fire?.();
    try {
      // data binding (Rive récent) : rive.viewModelInstance.trigger("entree").trigger()
      const vmi = (rive as unknown as { viewModelInstance?: { trigger?: (n: string) => { trigger?: () => void } } })?.viewModelInstance;
      if (state !== 'idle') vmi?.trigger?.(state)?.trigger?.();
    } catch { /* pas de view model → ignore */ }
  }, [state, riveOk, entree, salut, pointe, acquiesce, reconforte, celebre, rive]);

  // « parle » : boolean d'input OU propriété boolean de view model
  useEffect(() => {
    if (!riveOk) return;
    if (parleInput) (parleInput as { value: boolean }).value = speaking;
    try {
      const vmi = (rive as unknown as { viewModelInstance?: { boolean?: (n: string) => { value: boolean } | null } })?.viewModelInstance;
      const b = vmi?.boolean?.('parle');
      if (b) b.value = speaking;
    } catch { /* pas de view model → ignore */ }
  }, [speaking, riveOk, parleInput, rive]);

  const cls = state === 'idle' ? 'marc-idle' : `marc-${state}`;

  // Niveau 2 (si pas de marc.riv) : POSE-SWAP — une image par état si elle existe
  // (/mascotte/marc-<state>.webp), sinon repli sur le poinçonneur. Drop-in : il
  // suffit de déposer marc-idle.webp, marc-salut.webp… (optimisés ≤ ~150 Ko).
  const [poseSrc, setPoseSrc] = useState(`/mascotte/marc-${state}.webp`);
  useEffect(() => { setPoseSrc(`/mascotte/marc-${state}.webp`); }, [state]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Rive — invisible tant qu'il n'a pas chargé (drop-in) */}
      <div className="absolute inset-0" style={{ opacity: riveOk ? 1 : 0 }} aria-hidden={!riveOk}>
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      </div>
      {/* Doublure : pose par état (marc-<state>.webp) → repli poinçonneur.png */}
      {!riveOk && (
        <img
          key={state}
          src={poseSrc}
          onError={() => { if (!poseSrc.endsWith('poinconneur.png')) setPoseSrc('/mascotte/poinconneur.png'); }}
          alt=""
          className={`${cls} h-full w-full object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.28)]`}
          style={{ transformOrigin: '50% 80%' }}
        />
      )}
    </div>
  );
}
