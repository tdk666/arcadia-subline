-- =============================================================================
-- ARCADIA SUBLINE — Migration 0005 : Monétisation
-- battle_passes · pass_purchases (Stripe / RevenueCat, réconciliation webhook)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BATTLE_PASSES — un pass par saison (modèle revenu B2C principal, cf. BMC)
-- ---------------------------------------------------------------------------
create table if not exists public.battle_passes (
  id           uuid primary key default gen_random_uuid(),
  season_id    uuid not null references public.seasons(id) on delete cascade,
  name         text not null,                              -- ex: "Pass Révolution" / "Tourist Pass"
  price_cents  int not null check (price_cents >= 0),      -- prix de référence en centimes
  tiers        jsonb not null default '[]'::jsonb,         -- paliers de récompenses (cosmétiques only)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.battle_passes is
  'Battle Pass saisonnier. tiers = JSONB des paliers (récompenses cosmétiques — jamais de pay-to-win).';

-- ---------------------------------------------------------------------------
-- PASS_PURCHASES — achats joueurs, statut piloté par webhooks Stripe/RevenueCat
-- ---------------------------------------------------------------------------
create table if not exists public.pass_purchases (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references public.players(id)       on delete cascade,
  battle_pass_id  uuid not null references public.battle_passes(id) on delete restrict,
  provider        text not null check (provider in ('stripe', 'revenuecat')),
  provider_ref    text not null,                       -- payment_intent / transaction id
  status          purchase_status not null default 'pending',
  purchased_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Idempotence webhook : un même événement provider ne crée jamais deux achats
  unique (provider, provider_ref),
  -- Un joueur n'achète un même pass qu'une fois (hors remboursement géré par status)
  unique (player_id, battle_pass_id)
);
comment on table public.pass_purchases is
  'Achats de pass. Écrit UNIQUEMENT par le backend (webhooks service_role). pending→active→refunded.';

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['battle_passes','pass_purchases'] loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.fn_touch_updated_at();', t);
  end loop;
end $$;
