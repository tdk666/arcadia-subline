-- =============================================================================
-- ARCADIA SUBLINE — Migration 0003 : Contenu, Saisons, Sponsors, Quêtes
-- station_content · seasons · sponsors · quests · quest_steps
-- Le corpus de contenu = l'actif stratégique (cf. BMC, Ressources Clés).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SEASONS — cadre live-ops (saisons thématiques : Révolution, JO, Haussmann…)
-- network_id nullable = saison globale (multi-villes)
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid references public.networks(id) on delete cascade, -- NULL = globale
  name        text not null,
  theme       text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
comment on table public.seasons is 'Saisons live-ops. is_active piloté par les ops (une seule active par réseau, convention applicative).';

-- ---------------------------------------------------------------------------
-- SPONSORS — marques finançant des quêtes (revenu B2B forte marge)
-- ---------------------------------------------------------------------------
create table if not exists public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  contact     text,                       -- email/contact commercial
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.sponsors is 'Sponsors B2B des quêtes de marque. Jamais exposé en écriture côté client.';

-- ---------------------------------------------------------------------------
-- STATION_CONTENT — récits de stations (pipeline GenAI → curation humaine)
-- ---------------------------------------------------------------------------
create table if not exists public.station_content (
  id            uuid primary key default gen_random_uuid(),
  station_id    uuid not null references public.stations(id) on delete cascade,
  title         text not null,
  body          text not null,
  theme         text,                              -- ex: "Revolution"
  status        content_status not null default 'draft',
  generated_by  text not null default 'humain'
                check (generated_by in ('modele', 'humain')),  -- audit provenance GenAI
  curator_id    uuid references auth.users(id),    -- qui a validé/curé (audit)
  published_at  timestamptz,                       -- horodatage de publication
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Cohérence : un contenu publié doit être horodaté
  check (status <> 'published' or published_at is not null)
);
comment on table public.station_content is
  'Corpus culturel par station — le moat du produit. Workflow : draft (GenAI) → curated (humain) → published.';

-- ---------------------------------------------------------------------------
-- QUESTS — l'unité de gameplay. Ancrage flexible (station / ligne / saison),
-- toutes les FK d'ancrage sont nullables (quêtes multi-stations possibles).
-- ---------------------------------------------------------------------------
create table if not exists public.quests (
  id          uuid primary key default gen_random_uuid(),
  station_id  uuid references public.stations(id) on delete set null, -- nullable (multi-station)
  line_id     uuid references public.lines(id)    on delete set null, -- thématisation par ligne
  season_id   uuid references public.seasons(id)  on delete set null, -- programmation live-ops
  sponsor_id  uuid references public.sponsors(id) on delete set null, -- financement marque
  type        quest_type not null default 'knowledge',
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Garde-fou business : une quête sponsorisée DOIT référencer un sponsor, et inversement
  check ((type = 'sponsored') = (sponsor_id is not null))
);
comment on table public.quests is 'Quêtes : quiz (knowledge), terrain (exploration), marque (sponsored).';

-- ---------------------------------------------------------------------------
-- QUEST_STEPS — étapes ordonnées d'une quête (config quiz/mini-jeu en JSONB)
-- ---------------------------------------------------------------------------
create table if not exists public.quest_steps (
  id          uuid primary key default gen_random_uuid(),
  quest_id    uuid not null references public.quests(id) on delete cascade,
  position    int  not null check (position >= 0),
  prompt      text not null,                 -- énoncé affiché au joueur
  payload     jsonb not null default '{}'::jsonb, -- config quiz/mini-jeu (choix, assets…)
  answer_key  jsonb not null default '{}'::jsonb, -- corrigé — JAMAIS exposé au client (cf. RLS)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (quest_id, position)
);
comment on column public.quest_steps.answer_key is
  'Corrigé serveur. La validation des réponses se fait côté Edge Function / RPC — jamais côté client.';

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['seasons','sponsors','station_content','quests','quest_steps'] loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.fn_touch_updated_at();', t);
  end loop;
end $$;
