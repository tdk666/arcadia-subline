-- =============================================================================
-- ARCADIA SUBLINE — Seed de démonstration (tranche verticale Bastille)
-- À exécuter via : supabase db reset (local) ou SQL Editor (cloud).
-- UUID FIXES : ils sont référencés par /content (le front les connaît).
-- Idempotent (on conflict do nothing / update).
-- =============================================================================

-- ----- Réseau & ligne 1 ------------------------------------------------------
insert into public.networks (id, name, city, country, timezone)
values ('11111111-1111-4111-8111-111111111111', 'Île-de-France Mobilités', 'Paris', 'FR', 'Europe/Paris')
on conflict (id) do nothing;

insert into public.lines (id, network_id, code, name, color, mode)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
        'M1', 'La Défense — Château de Vincennes', '#f2c200', 'metro')
on conflict (id) do nothing;

-- ----- Stations de la ligne 1 (slug aligné sur /content/lines/ligne-1.json) ---
-- Bastille porte un UUID fixe (référencé par le front) ; les autres sont stables
-- par slug (unique (network_id, slug)).
with s(slug, name, pos) as (
  values
    ('la-defense', 'La Défense', 0),
    ('esplanade-de-la-defense', 'Esplanade de la Défense', 1),
    ('pont-de-neuilly', 'Pont de Neuilly', 2),
    ('les-sablons', 'Les Sablons', 3),
    ('porte-maillot', 'Porte Maillot', 4),
    ('argentine', 'Argentine', 5),
    ('charles-de-gaulle-etoile', 'Charles de Gaulle — Étoile', 6),
    ('george-v', 'George V', 7),
    ('franklin-d-roosevelt', 'Franklin D. Roosevelt', 8),
    ('champs-elysees-clemenceau', 'Champs-Élysées — Clemenceau', 9),
    ('concorde', 'Concorde', 10),
    ('tuileries', 'Tuileries', 11),
    ('palais-royal', 'Palais Royal — Musée du Louvre', 12),
    ('louvre-rivoli', 'Louvre — Rivoli', 13),
    ('chatelet', 'Châtelet', 14),
    ('hotel-de-ville', 'Hôtel de Ville', 15),
    ('saint-paul', 'Saint-Paul', 16),
    ('bastille', 'Bastille', 17),
    ('gare-de-lyon', 'Gare de Lyon', 18),
    ('reuilly-diderot', 'Reuilly — Diderot', 19),
    ('nation', 'Nation', 20),
    ('porte-de-vincennes', 'Porte de Vincennes', 21),
    ('saint-mande', 'Saint-Mandé', 22),
    ('berault', 'Bérault', 23),
    ('chateau-de-vincennes', 'Château de Vincennes', 24)
)
insert into public.stations (id, network_id, name, slug, geo)
select case when s.slug = 'bastille' then '33333333-3333-4333-8333-333333333333'::uuid
            else gen_random_uuid() end,
       '11111111-1111-4111-8111-111111111111', s.name, s.slug,
       case when s.slug = 'bastille'
            then st_setsrid(st_makepoint(2.369116, 48.853156), 4326)::geography end
  from s
on conflict (network_id, slug) do nothing;

insert into public.line_stations (line_id, station_id, position)
select '22222222-2222-4222-8222-222222222222', st.id, s.pos
  from (values
    ('la-defense',0),('esplanade-de-la-defense',1),('pont-de-neuilly',2),('les-sablons',3),
    ('porte-maillot',4),('argentine',5),('charles-de-gaulle-etoile',6),('george-v',7),
    ('franklin-d-roosevelt',8),('champs-elysees-clemenceau',9),('concorde',10),('tuileries',11),
    ('palais-royal',12),('louvre-rivoli',13),('chatelet',14),('hotel-de-ville',15),
    ('saint-paul',16),('bastille',17),('gare-de-lyon',18),('reuilly-diderot',19),('nation',20),
    ('porte-de-vincennes',21),('saint-mande',22),('berault',23),('chateau-de-vincennes',24)
  ) as s(slug, pos)
  join public.stations st
    on st.network_id = '11111111-1111-4111-8111-111111111111' and st.slug = s.slug
on conflict (line_id, station_id) do nothing;

-- ----- Contenu culturel publié (la fiche savoir débloquée après victoire) -----
insert into public.station_content (station_id, title, body, theme, status, generated_by, published_at)
select '33333333-3333-4333-8333-333333333333',
       '14 juillet 1789 — la chute d''un symbole',
       'La Bastille n''était presque plus une prison : sept détenus, dont quatre faussaires. '
       || 'Mais elle incarnait l''arbitraire royal — on pouvait y être jeté sur simple lettre de cachet, sans procès. '
       || 'Le 14 juillet 1789, près d''un millier de Parisiens viennent y chercher la poudre entreposée. '
       || 'L''assaut dure une après-midi ; la forteresse tombe, puis sera démolie pierre par pierre. '
       || 'Certaines de ses pierres ont servi à construire le pont de la Concorde — vous marchez peut-être dessus. '
       || 'Sur le quai de la ligne 5, des vestiges des fossés sont encore visibles.',
       'Revolution', 'published', 'humain', now()
where not exists (
  select 1 from public.station_content
   where station_id = '33333333-3333-4333-8333-333333333333' and theme = 'Revolution');

-- ----- Les 3 quêtes-paliers de Bastille (démolition) --------------------------
-- type 'knowledge' (PAS exploration) : jouable SANS check-in — async-first.
-- La maîtrise "physique" (mastered) exige quand même le check-in (règle 0010).
insert into public.quests (id, station_id, line_id, type, title, difficulty)
values
  ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222', 'knowledge', 'La Prise de la Bastille — Bronze', 'bronze'),
  ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222', 'knowledge', 'La Prise de la Bastille — Argent', 'silver'),
  ('44444444-4444-4444-8444-444444444403', '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222', 'knowledge', 'La Prise de la Bastille — Or', 'gold')
on conflict (id) do update set difficulty = excluded.difficulty;

-- Étapes : payload = paramètres CLIENT (jouabilité), answer_key = seuils SERVEUR.
-- Les valeurs payload reflètent /content/stations/bastille.json — le serveur ne
-- fait confiance qu'à answer_key.
insert into public.quest_steps (id, quest_id, position, prompt, payload, answer_key)
values
  ('66666666-6666-4666-8666-666666666601', '44444444-4444-4444-8444-444444444401', 0,
   'Abats les trois étendards royaux de la forteresse.',
   '{"kind":"minigame","archetype":"demolition","skin":"bastille",
     "max_shots":5,"hp_multiplier":1,"target_pct":0,"time_limit_s":0,"reinforced":false}',
   '{"kind":"demolition","max_shots":5,"min_destruction_pct":0,"total_targets":3,
     "time_limit_s":0,"tier_multiplier":1.0}'),
  ('66666666-6666-4666-8666-666666666602', '44444444-4444-4444-8444-444444444402', 0,
   'Murs renforcés, moins de boulets : abats les trois étendards et 35 % de la forteresse.',
   '{"kind":"minigame","archetype":"demolition","skin":"bastille",
     "max_shots":4,"hp_multiplier":1.45,"target_pct":35,"time_limit_s":0,"reinforced":false}',
   '{"kind":"demolition","max_shots":4,"min_destruction_pct":35,"total_targets":3,
     "time_limit_s":0,"tier_multiplier":1.5}'),
  ('66666666-6666-4666-8666-666666666603', '44444444-4444-4444-8444-444444444403', 0,
   'Plaques de fer, trois boulets, 75 secondes : rase la moitié de la forteresse.',
   '{"kind":"minigame","archetype":"demolition","skin":"bastille",
     "max_shots":3,"hp_multiplier":1.8,"target_pct":50,"time_limit_s":75,"reinforced":true}',
   '{"kind":"demolition","max_shots":3,"min_destruction_pct":50,"total_targets":3,
     "time_limit_s":75,"tier_multiplier":2.0}')
on conflict (id) do update set payload = excluded.payload, answer_key = excluded.answer_key;
