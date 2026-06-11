-- =============================================================================
-- ARCADIA SUBLINE — Migration 0004 : Boucle de jeu
-- players · player_station_progress · player_line_progress
-- quest_attempts · check_ins (+ COOLDOWN anti-triche)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PLAYERS — profil de jeu, 1:1 avec auth.users (players.id = auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  home_line_id    uuid references public.lines(id) on delete set null, -- "ta ligne" (communauté)
  xp_total        int not null default 0 check (xp_total >= 0),
  streak_count    int not null default 0 check (streak_count >= 0),    -- jours consécutifs
  last_played_at  timestamptz,                                         -- pivot du calcul de streak
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.players is 'Profil joueur. PK = auth.users(id). streak/last_played_at = boucle de rétention.';

-- (Optionnel) Auto-provisionnement du profil à l'inscription Supabase Auth.
-- Décommenter si vous voulez créer la ligne players automatiquement :
-- create or replace function public.fn_handle_new_user()
-- returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   insert into public.players (id, display_name)
--   values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Voyageur'))
--   on conflict (id) do nothing;
--   return new;
-- end; $$;
-- drop trigger if exists trg_on_auth_user_created on auth.users;
-- create trigger trg_on_auth_user_created after insert on auth.users
--   for each row execute function public.fn_handle_new_user();

-- ---------------------------------------------------------------------------
-- PLAYER_STATION_PROGRESS — progression par station (discovered→visited→mastered)
-- ---------------------------------------------------------------------------
create table if not exists public.player_station_progress (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.players(id) on delete cascade,
  station_id     uuid not null references public.stations(id) on delete cascade,
  state          progress_state not null default 'discovered',
  mastery_score  int not null default 0 check (mastery_score between 0 and 100),
  visits_count   int not null default 0 check (visits_count >= 0),
  first_seen_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (player_id, station_id)   -- une seule ligne de progression par couple
);
comment on table public.player_station_progress is
  'Cœur de la boucle : chaque station traversée devient un état de jeu (mastery 0–100).';

-- ---------------------------------------------------------------------------
-- PLAYER_LINE_PROGRESS — agrégat de conquête par ligne ("conquiers ta ligne")
-- ---------------------------------------------------------------------------
create table if not exists public.player_line_progress (
  id                 uuid primary key default gen_random_uuid(),
  player_id          uuid not null references public.players(id) on delete cascade,
  line_id            uuid not null references public.lines(id) on delete cascade,
  stations_mastered  int not null default 0 check (stations_mastered >= 0),
  line_score         int not null default 0 check (line_score >= 0),
  rank_cache         int,                       -- rang dénormalisé (rafraîchi avec les matviews)
  updated_at         timestamptz not null default now(),
  unique (player_id, line_id)
);
comment on column public.player_line_progress.rank_cache is
  'Cache de rang recalculé lors du refresh leaderboard — jamais source de vérité.';

-- ---------------------------------------------------------------------------
-- QUEST_ATTEMPTS — tentatives horodatées. duration_ms = signal anti-triche
-- ---------------------------------------------------------------------------
create table if not exists public.quest_attempts (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players(id) on delete cascade,
  quest_id     uuid not null references public.quests(id)  on delete cascade,
  season_id    uuid references public.seasons(id) on delete set null, -- horodatage saisonnier
  score        int not null default 0 check (score >= 0),
  success      boolean not null default false,
  duration_ms  int check (duration_ms is null or duration_ms >= 0),
  -- Anti-triche basique : une réponse < 300 ms à un quiz est physiologiquement suspecte ;
  -- le scoring serveur (Edge Function) peut pénaliser/rejeter sous ce seuil.
  created_at   timestamptz not null default now()
);
comment on table public.quest_attempts is 'Journal immuable des tentatives (insert-only côté joueur, cf. RLS).';

-- ---------------------------------------------------------------------------
-- CHECK_INS — validation de présence, async-first & location-optional
-- method: geo (si GPS dispo en surface) | manual (déclaratif + cooldown) | qr (in-station)
-- ---------------------------------------------------------------------------
create table if not exists public.check_ins (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id)  on delete cascade,
  station_id  uuid not null references public.stations(id) on delete cascade,
  method      checkin_method not null default 'manual',
  confidence  numeric(3,2) not null default 1.00
              check (confidence >= 0 and confidence <= 1), -- 1.0 = qr, ~0.6 = manual…
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '10 minutes'
              -- TTL : un check-in n'ouvre les quêtes de la station que pendant sa fenêtre
);
comment on table public.check_ins is
  'Présence en station. TTL via expires_at + COOLDOWN anti-téléportation (trigger ci-dessous).';

-- ---------------------------------------------------------------------------
-- CONTRAINTE DE COOLDOWN (anti-triche "téléportation")
-- Règle : rejeter 2 check-ins du même joueur sur 2 stations DISTINCTES espacés
-- de moins de X secondes (trajet physiquement impossible).
-- X est paramétrable via le GUC 'arcadia.checkin_cooldown_seconds' (défaut 90 s) :
--   alter database postgres set arcadia.checkin_cooldown_seconds = '120';
-- ---------------------------------------------------------------------------
create or replace function public.fn_enforce_checkin_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cooldown_s int;
  v_last       record;
begin
  -- Paramètre runtime, défaut 90 s si non défini / invalide
  begin
    v_cooldown_s := coalesce(nullif(current_setting('arcadia.checkin_cooldown_seconds', true), '')::int, 90);
  exception when others then
    v_cooldown_s := 90;
  end;

  -- Dernier check-in du joueur (index ix_check_ins_player_created le rend O(1))
  select c.station_id, c.created_at
    into v_last
    from public.check_ins c
   where c.player_id = new.player_id
   order by c.created_at desc
   limit 1;

  if found
     and v_last.station_id <> new.station_id
     and new.created_at - v_last.created_at < make_interval(secs => v_cooldown_s)
  then
    raise exception
      'COOLDOWN_VIOLATION: check-in sur une station distincte à moins de % s du précédent (trajet impossible)',
      v_cooldown_s
      using errcode = 'P0001', hint = 'Réessayer après expiration du cooldown.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_checkin_cooldown on public.check_ins;
create trigger trg_checkin_cooldown
  before insert on public.check_ins
  for each row execute function public.fn_enforce_checkin_cooldown();

comment on function public.fn_enforce_checkin_cooldown() is
  'Anti-triche : interdit deux check-ins sur deux stations différentes en < X secondes (GUC arcadia.checkin_cooldown_seconds, défaut 90).';

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['players','player_station_progress','player_line_progress'] loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.fn_touch_updated_at();', t);
  end loop;
end $$;
