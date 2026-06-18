import { pickText, useI18n } from '../i18n';
import { useArcadia } from '../store';
import { COSMETICS } from '../lib/cosmetics';
import { tap, haptic } from '../lib/feedback';
import { Mascotte } from '../components/Mascotte';
import { IconToken, IconLock } from '../components/icons';

/**
 * BOUTIQUE — la surface de personnalisation (vision : cosmétiques, jamais
 * pay-to-win). v1 : halos d'avatar achetés en jetons (sink réel sans assets).
 * Les tenues illustrées de la mascotte viendront ensuite (génération d'art).
 */
export function BoutiqueScreen() {
  const { t, locale } = useI18n();
  const coins = useArcadia((s) => s.coins);
  const owned = useArcadia((s) => s.owned);
  const equippedAura = useArcadia((s) => s.equippedAura);
  const buy = useArcadia((s) => s.buyCosmetic);
  const equip = useArcadia((s) => s.equipCosmetic);

  return (
    <div className="px-4 pb-8 pt-5">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-laiton/20 text-laiton">
          <IconToken size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('shop.title')}</h1>
          <p className="truncate text-xs text-pierre-dim">{t('shop.subtitle')}</p>
        </div>
        <div className="flex flex-none items-center gap-1.5 rounded-full bg-craie-2 px-3 py-1.5">
          <IconToken size={18} className="text-laiton" />
          <span className="font-display text-lg font-extrabold tabular-nums text-pierre">{coins.toLocaleString()}</span>
        </div>
      </header>

      {/* aperçu de l'avatar avec l'aura équipée */}
      <div className="mt-5 flex justify-center">
        <span
          className="relative flex h-28 w-28 items-center justify-center rounded-full"
          style={{ background: `radial-gradient(circle at 50% 70%, ${aura(equippedAura)}40, transparent 70%)` }}
        >
          <Mascotte size={104} />
        </span>
      </div>

      <h2 className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-pierre-faint">{t('shop.auras')}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {COSMETICS.filter((c) => c.slot === 'aura').map((c) => {
          const isOwned = owned.includes(c.id);
          const isEquipped = equippedAura === c.id;
          const canAfford = coins >= c.cost;
          return (
            <div key={c.id} className="flex flex-col items-center rounded-2xl border border-rail bg-plomb p-3">
              <span
                className="mt-1 h-12 w-12 rounded-full ring-4 ring-inset"
                style={{ background: `${c.color}22`, color: c.color, boxShadow: `inset 0 0 0 3px ${c.color}` }}
              />
              <p className="mt-2 text-center font-display text-sm font-bold text-pierre">{pickText(c.name, locale)}</p>

              {isEquipped ? (
                <span className="mt-2 rounded-lg bg-guimard/15 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-guimard">
                  ✓ {t('shop.equipped')}
                </span>
              ) : isOwned ? (
                <button
                  type="button"
                  onClick={() => { tap(); equip(c.id); }}
                  className="mt-2 rounded-lg border border-rail px-3 py-1.5 font-display text-xs font-bold text-pierre active:bg-plomb-hi"
                >
                  {t('shop.equip')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => { if (buy(c.id)) haptic([20, 40, 20]); }}
                  className={`mt-2 flex items-center gap-1 rounded-lg px-3 py-1.5 font-display text-xs font-extrabold ${
                    canAfford ? 'bg-laiton text-encre active:scale-[0.97]' : 'bg-rail/50 text-pierre-faint'
                  }`}
                  title={canAfford ? undefined : t('shop.notEnough')}
                >
                  {canAfford ? <IconToken size={14} /> : <IconLock size={14} />}
                  {c.cost}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center font-mono text-[11px] text-pierre-faint">🧥 {t('shop.soon')}</p>
    </div>
  );
}

function aura(id: string): string {
  return COSMETICS.find((c) => c.id === id)?.color ?? '#0a5a9e';
}
