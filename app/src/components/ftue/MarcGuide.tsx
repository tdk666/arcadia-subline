/**
 * MARC — guide animé de la FTUE « L'Émergence ».
 * DROP-IN RIVE : si /mascotte/marc.riv existe, on pilote la state machine « Marc »
 * via le CONTRAT D'INPUTS (entree/salut/pointe/acquiesce/reconforte/celebre + parle).
 * Tant que le .riv est absent, on rend une DOUBLURE animée (le poinçonneur PNG +
 * une pose CSS par état) : la cinématique tourne AVANT l'arrivée du .riv, puis le
 * .riv se branche sans changer cette API. Cf. brain/marc-rive-agent-prompt.md.
 */
import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { Mascotte } from '../Mascotte';

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
    onLoad: () => setRiveOk(true),
    onLoadError: () => setRiveOk(false),
  });

  // inputs du contrat (null tant que rive non chargé → no-op)
  const entree = useStateMachineInput(rive, 'Marc', 'entree');
  const salut = useStateMachineInput(rive, 'Marc', 'salut');
  const pointe = useStateMachineInput(rive, 'Marc', 'pointe');
  const acquiesce = useStateMachineInput(rive, 'Marc', 'acquiesce');
  const reconforte = useStateMachineInput(rive, 'Marc', 'reconforte');
  const celebre = useStateMachineInput(rive, 'Marc', 'celebre');
  const parle = useStateMachineInput(rive, 'Marc', 'parle');

  useEffect(() => {
    if (!riveOk) return;
    const triggers: Record<string, { fire?: () => void } | null> = {
      entree, salut, pointe, acquiesce, reconforte, celebre,
    };
    triggers[state]?.fire?.();
  }, [state, riveOk, entree, salut, pointe, acquiesce, reconforte, celebre]);

  useEffect(() => {
    if (!riveOk || !parle) return;
    parle.value = speaking;
  }, [speaking, riveOk, parle]);

  const cls = state === 'idle' ? 'marc-idle' : `marc-${state}`;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Rive — invisible tant qu'il n'a pas chargé (drop-in) */}
      <div className="absolute inset-0" style={{ opacity: riveOk ? 1 : 0 }} aria-hidden={!riveOk}>
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      </div>
      {/* Doublure animée (poinçonneur) — key force le replay de la pose à chaque état */}
      {!riveOk && (
        <div key={state} className={cls} style={{ width: '100%', height: '100%', transformOrigin: '50% 80%' }}>
          <Mascotte size={size} className="h-full w-full drop-shadow-[0_10px_22px_rgba(0,0,0,0.28)]" />
        </div>
      )}
    </div>
  );
}
