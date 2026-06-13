import { useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { useI18n } from '../i18n';

/**
 * Fiche d'auth en bas d'écran — appelée au "point de conversion" (après la
 * 1ʳᵉ victoire) et depuis le profil. Jamais en mur d'entrée.
 */
export function AuthSheet({ onClose, intro }: { onClose: () => void; intro?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === 'signup'
        ? await backend.signUp(email, password, displayName || email.split('@')[0])
        : await backend.signIn(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="animate-slide-up w-full max-w-md rounded-t-2xl border-t border-rail bg-plomb p-5 pb-8 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {mode === 'signup' ? t('auth.signupTitle') : t('auth.loginTitle')}
        </h2>
        {intro && <p className="mt-1 text-sm text-pierre-dim">{intro}</p>}

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              className="rounded-xl border border-rail bg-encre-2 px-4 py-3 text-sm outline-none focus:border-ambre"
              placeholder={t('auth.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
            />
          )}
          <input
            className="rounded-xl border border-rail bg-encre-2 px-4 py-3 text-sm outline-none focus:border-ambre"
            type="email"
            required
            autoComplete="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl border border-rail bg-encre-2 px-4 py-3 text-sm outline-none focus:border-ambre"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-400">{t('auth.errors.generic')} ({error})</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-laiton py-3 font-display font-bold text-encre transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? t('common.loading') : mode === 'signup' ? t('auth.signup') : t('auth.login')}
          </button>
        </form>

        <button
          type="button"
          className="mt-3 w-full text-center text-xs text-pierre-dim underline-offset-2 active:underline"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
        >
          {mode === 'signup' ? t('auth.toLogin') : t('auth.toSignup')}
        </button>
      </div>
    </div>
  );
}
