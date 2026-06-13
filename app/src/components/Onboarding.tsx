/**
 * PREMIER LANCEMENT — trois tableaux, une promesse.
 * Émotion d'abord (la rame ligne 6 qui émerge devant la tour Eiffel), puis le
 * fantasme (Paris = plateau), puis la mission (conquiers ta ligne).
 * Skippable à tout instant, i18n, guest-first : aucun compte demandé.
 */
import { useState } from 'react';
import { useI18n } from '../i18n';

export const ONBOARDING_KEY = 'arcadia.onboarded.v1';

/* ── Tableaux SVG (zéro asset, DA néon) ─────────────────────────────── */

function SceneEiffel() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ob-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15110c" />
          <stop offset="0.7" stopColor="#2a1d10" />
          <stop offset="1" stopColor="#3a2618" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill="url(#ob-sky)" />
      {/* tour Eiffel en traits néon */}
      <g stroke="#f2c200" strokeWidth="2" fill="none" opacity="0.9">
        <path d="M160 30 L138 150 M160 30 L182 150" />
        <path d="M146 95 Q160 102 174 95" />
        <path d="M138 150 Q160 162 182 150" />
        <path d="M138 150 L118 196 M182 150 L202 196" />
        <path d="M126 178 Q160 196 194 178" />
      </g>
      <circle cx="160" cy="26" r="3" fill="#f2c200" className="animate-glow" />
      {/* viaduc + rame ligne 6 */}
      <line x1="0" y1="208" x2="320" y2="208" stroke="#3a2f1e" strokeWidth="5" />
      <g className="ob-train">
        <rect x="-150" y="186" width="120" height="20" rx="6" fill="#241f18" stroke="#e0964a" strokeWidth="1.6" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-140 + i * 28} y="191" width="18" height="10" rx="2" fill="#15110c" stroke="#e0964a" strokeWidth="1" />
        ))}
      </g>
      {/* reflets de Seine */}
      <g stroke="#e0964a" strokeWidth="1.4" opacity="0.35">
        <line x1="40" y1="226" x2="84" y2="226" />
        <line x1="150" y1="232" x2="210" y2="232" />
        <line x1="250" y1="224" x2="286" y2="224" />
      </g>
    </svg>
  );
}

function SceneNetwork() {
  const lines = [
    { d: 'M20 60 H300', c: '#f2c200' },
    { d: 'M20 120 H300', c: '#0a5a9e' },
    { d: 'M20 180 H300', c: '#bb2e2a' },
    { d: 'M70 20 V220', c: '#1f8a52' },
    { d: 'M160 20 V220', c: '#ff7e2e' },
    { d: 'M250 20 V220', c: '#e0964a' },
  ];
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full" aria-hidden>
      <rect width="320" height="240" fill="#15110c" />
      {lines.map((l, i) => (
        <path key={i} d={l.d} stroke={l.c} strokeWidth="3" fill="none" strokeLinecap="round"
          className="ob-line" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
      {[[70, 60], [160, 120], [250, 180], [70, 180], [250, 60], [160, 60]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill="#15110c" stroke="#e7dcc4" strokeWidth="2.5"
          className="ob-station" style={{ animationDelay: `${0.9 + i * 0.12}s` }} />
      ))}
    </svg>
  );
}

function SceneBastille() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full" aria-hidden>
      <rect width="320" height="240" fill="#15110c" />
      {/* plaque émaillée */}
      <rect x="60" y="58" width="200" height="56" rx="8" fill="#0a5a9e" stroke="#e7dcc4" strokeWidth="3" />
      <text x="160" y="94" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800"
        fontFamily="system-ui" letterSpacing="3">BASTILLE</text>
      {/* trois médailles de palier */}
      {[{ x: 110, c: '#e0945a' }, { x: 160, c: '#c9d2dc' }, { x: 210, c: '#f2c200' }].map((m, i) => (
        <g key={i} className="ob-station" style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
          <circle cx={m.x} cy="160" r="20" fill="#241f18" stroke={m.c} strokeWidth="3" />
          <text x={m.x} y="167" textAnchor="middle" fill={m.c} fontSize="18">★</text>
        </g>
      ))}
      <line x1="40" y1="208" x2="280" y2="208" stroke="#f2c200" strokeWidth="3" strokeLinecap="round" />
      <circle cx="160" cy="208" r="7" fill="#f2c200" className="animate-glow" />
    </svg>
  );
}

/* ── Composant ───────────────────────────────────────────────────────── */

const SCENES = [SceneEiffel, SceneNetwork, SceneBastille];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const Scene = SCENES[step];
  const key = (`s${step + 1}`) as 's1' | 's2' | 's3';

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col bg-encre">
      <button
        type="button"
        onClick={finish}
        className="absolute right-4 top-[max(env(safe-area-inset-top),1rem)] z-10 rounded-full bg-black/40 px-3.5 py-1.5 font-mono text-xs text-pierre-faint backdrop-blur active:text-pierre"
      >
        {t('common.skip')} ›
      </button>

      <div key={step} className="animate-ob-scene min-h-0 flex-[3]">
        <Scene />
      </div>

      <div key={`txt-${step}`} className="animate-slide-up flex flex-[2] flex-col px-7 pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-vermillon">
          {t(`onboarding.${key}.kicker`)}
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-pierre">
          {t(`onboarding.${key}.title`)}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-pierre-dim">
          {t(`onboarding.${key}.body`)}
        </p>
      </div>

      <div className="safe-bottom flex items-center justify-between px-7 pb-6">
        <div className="flex gap-2">
          {SCENES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-laiton' : 'w-1.5 bg-rail'
              }`}
            />
          ))}
        </div>
        {step < SCENES.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="rounded-xl bg-plomb-hi px-6 py-3 font-display font-bold text-pierre active:scale-[0.97]"
          >
            {t('common.continue')} →
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="animate-glow rounded-xl bg-laiton px-6 py-3 font-display font-bold text-encre active:scale-[0.97]"
          >
            ⚜ {t('onboarding.cta')}
          </button>
        )}
      </div>
    </div>
  );
}
