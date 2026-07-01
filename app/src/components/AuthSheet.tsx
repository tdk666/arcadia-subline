import { useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { track } from '../lib/analytics';
import { useI18n } from '../i18n';
import { Button } from './Button';

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
  const [confirmSent, setConfirmSent] = useState(false);

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
    else {
      if (mode === 'signup') track('signup_from_guest');
      if ('needsConfirm' in res && res.needsConfirm) setConfirmSent(true);
      else onClose();
    }
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
        {intro && !confirmSent && <p className="mt-1 text-sm text-pierre-dim">{intro}</p>}

        {confirmSent ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-pierre">{t('auth.confirmSent', { email })}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-rail py-2.5 text-sm text-pierre-dim active:bg-plomb-hi"
              onClick={onClose}
            >
              {t('common.continue')}
            </button>
          </div>
        ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              className="rounded-xl border border-rail bg-craie-2 px-4 py-3 text-sm outline-none focus:border-ambre"
              placeholder={t('auth.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
            />
          )}
          <input
            className="rounded-xl border border-rail bg-craie-2 px-4 py-3 text-sm outline-none focus:border-ambre"
            type="email"
            required
            autoComplete="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl border border-rail bg-craie-2 px-4 py-3 text-sm outline-none focus:border-ambre"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* message générique only : on n'expose pas le code d'erreur brut à l'utilisateur */}
          {error && <p className="text-xs text-vermillon" title={error}>{t('auth.errors.generic')}</p>}
          <Button type="submit" variant="gold" size="md" disabled={busy}>
            {busy ? t('common.loading') : mode === 'signup' ? t('auth.signup') : t('auth.login')}
          </Button>
        </form>
        )}

        {!confirmSent && (
          <button
            type="button"
            className="mt-3 w-full text-center text-xs text-pierre-dim underline-offset-2 active:underline"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup' ? t('auth.toLogin') : t('auth.toSignup')}
          </button>
        )}
      </div>
    </div>
  );
}
