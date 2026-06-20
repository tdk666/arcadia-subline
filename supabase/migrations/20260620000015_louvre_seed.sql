-- =============================================================================
-- ARCADIA SUBLINE — Migration 0015 : SEED Louvre-Rivoli (2ᵉ station, archétype QUIZ)
--
-- 2ᵉ archétype prouvé : un quiz culturel scoré par fn_submit_attempt SANS
-- modifier son autorité (branche quiz de 0012, inchangée). Modélisation :
--   · 1 question = 1 quest_step
--   · payload    = énoncé + choix (rendu client) + points (lu par le serveur)
--   · answer_key = { "answer": "<id>" }  ← corrigé AUTORITATIF, jamais exposé
--   · PAS de kind:'minigame' → le serveur passe par la branche quiz.
-- Paliers : bronze Q1–Q5 (3 vies), silver Q1–Q6 (2 vies, chrono), gold Q1–Q8
--   (1 vie, chrono). Le succès exige TOUTES les réponses correctes.
--
-- INVARIANT : on ne FABRIQUE PAS l'UUID de station — il est résolu par requête
-- sur le slug (la station vient du seed réseau / GTFS). Idempotent.
-- =============================================================================

-- ----- Garde-fou : la station doit exister (seed réseau appliqué) -------------
do $$
begin
  if not exists (
    select 1 from public.stations
     where slug = 'louvre-rivoli'
       and network_id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'SEED_PREREQ_MISSING: station louvre-rivoli absente (appliquer le seed réseau d''abord).';
  end if;
end $$;

-- ----- Contenu culturel publié (fiche savoir débloquée après victoire) --------
insert into public.station_content (station_id, title, body, theme, status, generated_by, published_at)
select (select id from public.stations
          where slug = 'louvre-rivoli'
            and network_id = '11111111-1111-4111-8111-111111111111'),
       'Le Louvre — de la forteresse au musée du monde',
       'Le Louvre naît vers 1190 comme forteresse de Philippe Auguste pour garder Paris par l''ouest. '
       || 'François Iᵉʳ le mue en palais Renaissance et y attire les arts ; Louis XIV le délaisse pour Versailles en 1682. '
       || 'La Révolution le rouvre au peuple : le 10 août 1793, le « Muséum central des arts » expose les collections '
       || 'royales devenues nationales. La pyramide de I. M. Pei (1989) en fait l''entrée la plus célèbre du monde. '
       || 'La station Louvre-Rivoli fut l''une des premières stations « musée » du métro, ornée de copies d''œuvres dès 1968.',
       'Louvre', 'published', 'humain', now()
where not exists (
  select 1 from public.station_content sc
   where sc.station_id = (select id from public.stations
                            where slug = 'louvre-rivoli'
                              and network_id = '11111111-1111-4111-8111-111111111111')
     and sc.theme = 'Louvre');

-- ----- Les 3 quêtes-paliers (type 'knowledge' : jouable sans check-in) --------
insert into public.quests (id, station_id, line_id, type, title, difficulty)
values
  ('44444444-4444-4444-8444-444444444411',
   (select id from public.stations where slug = 'louvre-rivoli'
      and network_id = '11111111-1111-4111-8111-111111111111'),
   '22222222-2222-4222-8222-222222222222', 'knowledge', 'Le Cabinet des Merveilles — Bronze', 'bronze'),
  ('44444444-4444-4444-8444-444444444412',
   (select id from public.stations where slug = 'louvre-rivoli'
      and network_id = '11111111-1111-4111-8111-111111111111'),
   '22222222-2222-4222-8222-222222222222', 'knowledge', 'Le Cabinet des Merveilles — Argent', 'silver'),
  ('44444444-4444-4444-8444-444444444413',
   (select id from public.stations where slug = 'louvre-rivoli'
      and network_id = '11111111-1111-4111-8111-111111111111'),
   '22222222-2222-4222-8222-222222222222', 'knowledge', 'Le Cabinet des Merveilles — Or', 'gold')
on conflict (id) do update
  set station_id = excluded.station_id,
      line_id    = excluded.line_id,
      difficulty = excluded.difficulty,
      title      = excluded.title;

-- ----- Étapes-quiz : payload = énoncé/choix/points · answer_key = { answer } --
-- Les stepId sont déterministes et embarqués dans content/stations/louvre-rivoli.json.
insert into public.quest_steps (id, quest_id, position, prompt, payload, answer_key)
values
  -- ===== BRONZE (Q1–Q5) =====================================================
  ('77777777-7777-4777-8777-777777770101', '44444444-4444-4444-8444-444444444411', 0,
   'Quel roi a transformé le Louvre de forteresse médiévale en palais Renaissance ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quel roi a transformé le Louvre de forteresse médiévale en palais Renaissance ?","en":"Which king turned the Louvre from a medieval fortress into a Renaissance palace?"},
     "choices":[{"id":"a","text":{"fr":"François Iᵉʳ","en":"François I"}},{"id":"b","text":{"fr":"Louis XIV","en":"Louis XIV"}},{"id":"c","text":{"fr":"Napoléon Iᵉʳ","en":"Napoleon I"}},{"id":"d","text":{"fr":"Henri IV","en":"Henri IV"}}]}',
   '{"answer":"a"}'),
  ('77777777-7777-4777-8777-777777770102', '44444444-4444-4444-8444-444444444411', 1,
   'Qui a conçu la pyramide de verre du Louvre ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Qui a conçu la pyramide de verre du Louvre ?","en":"Who designed the Louvre''s glass pyramid?"},
     "choices":[{"id":"a","text":{"fr":"Gustave Eiffel","en":"Gustave Eiffel"}},{"id":"b","text":{"fr":"Ieoh Ming Pei","en":"Ieoh Ming Pei"}},{"id":"c","text":{"fr":"Le Corbusier","en":"Le Corbusier"}},{"id":"d","text":{"fr":"Jean Nouvel","en":"Jean Nouvel"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770103', '44444444-4444-4444-8444-444444444411', 2,
   'En quelle année la pyramide a-t-elle été inaugurée ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"En quelle année la pyramide a-t-elle été inaugurée ?","en":"In what year was the pyramid inaugurated?"},
     "choices":[{"id":"a","text":{"fr":"1968","en":"1968"}},{"id":"b","text":{"fr":"1979","en":"1979"}},{"id":"c","text":{"fr":"1989","en":"1989"}},{"id":"d","text":{"fr":"1999","en":"1999"}}]}',
   '{"answer":"c"}'),
  ('77777777-7777-4777-8777-777777770104', '44444444-4444-4444-8444-444444444411', 3,
   'Quelle déesse la « Vénus de Milo » représente-t-elle ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quelle déesse la « Vénus de Milo » représente-t-elle ?","en":"Which goddess does the ''Venus de Milo'' depict?"},
     "choices":[{"id":"a","text":{"fr":"Athéna","en":"Athena"}},{"id":"b","text":{"fr":"Aphrodite","en":"Aphrodite"}},{"id":"c","text":{"fr":"Artémis","en":"Artemis"}},{"id":"d","text":{"fr":"Héra","en":"Hera"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770105', '44444444-4444-4444-8444-444444444411', 4,
   'Quel roi quitte le Louvre pour Versailles en 1682, y laissant la cour exsangue ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quel roi quitte le Louvre pour Versailles en 1682, y laissant la cour exsangue ?","en":"Which king left the Louvre for Versailles in 1682?"},
     "choices":[{"id":"a","text":{"fr":"Louis XIII","en":"Louis XIII"}},{"id":"b","text":{"fr":"François Iᵉʳ","en":"François I"}},{"id":"c","text":{"fr":"Louis XIV","en":"Louis XIV"}},{"id":"d","text":{"fr":"Charles V","en":"Charles V"}}]}',
   '{"answer":"c"}'),
  -- ===== ARGENT (Q1–Q6) =====================================================
  ('77777777-7777-4777-8777-777777770201', '44444444-4444-4444-8444-444444444412', 0,
   'Quel roi a transformé le Louvre de forteresse médiévale en palais Renaissance ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quel roi a transformé le Louvre de forteresse médiévale en palais Renaissance ?","en":"Which king turned the Louvre from a medieval fortress into a Renaissance palace?"},
     "choices":[{"id":"a","text":{"fr":"François Iᵉʳ","en":"François I"}},{"id":"b","text":{"fr":"Louis XIV","en":"Louis XIV"}},{"id":"c","text":{"fr":"Napoléon Iᵉʳ","en":"Napoleon I"}},{"id":"d","text":{"fr":"Henri IV","en":"Henri IV"}}]}',
   '{"answer":"a"}'),
  ('77777777-7777-4777-8777-777777770202', '44444444-4444-4444-8444-444444444412', 1,
   'Qui a conçu la pyramide de verre du Louvre ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Qui a conçu la pyramide de verre du Louvre ?","en":"Who designed the Louvre''s glass pyramid?"},
     "choices":[{"id":"a","text":{"fr":"Gustave Eiffel","en":"Gustave Eiffel"}},{"id":"b","text":{"fr":"Ieoh Ming Pei","en":"Ieoh Ming Pei"}},{"id":"c","text":{"fr":"Le Corbusier","en":"Le Corbusier"}},{"id":"d","text":{"fr":"Jean Nouvel","en":"Jean Nouvel"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770203', '44444444-4444-4444-8444-444444444412', 2,
   'En quelle année la pyramide a-t-elle été inaugurée ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"En quelle année la pyramide a-t-elle été inaugurée ?","en":"In what year was the pyramid inaugurated?"},
     "choices":[{"id":"a","text":{"fr":"1968","en":"1968"}},{"id":"b","text":{"fr":"1979","en":"1979"}},{"id":"c","text":{"fr":"1989","en":"1989"}},{"id":"d","text":{"fr":"1999","en":"1999"}}]}',
   '{"answer":"c"}'),
  ('77777777-7777-4777-8777-777777770204', '44444444-4444-4444-8444-444444444412', 3,
   'Quelle déesse la « Vénus de Milo » représente-t-elle ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quelle déesse la « Vénus de Milo » représente-t-elle ?","en":"Which goddess does the ''Venus de Milo'' depict?"},
     "choices":[{"id":"a","text":{"fr":"Athéna","en":"Athena"}},{"id":"b","text":{"fr":"Aphrodite","en":"Aphrodite"}},{"id":"c","text":{"fr":"Artémis","en":"Artemis"}},{"id":"d","text":{"fr":"Héra","en":"Hera"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770205', '44444444-4444-4444-8444-444444444412', 4,
   'Quel roi quitte le Louvre pour Versailles en 1682, y laissant la cour exsangue ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quel roi quitte le Louvre pour Versailles en 1682, y laissant la cour exsangue ?","en":"Which king left the Louvre for Versailles in 1682?"},
     "choices":[{"id":"a","text":{"fr":"Louis XIII","en":"Louis XIII"}},{"id":"b","text":{"fr":"François Iᵉʳ","en":"François I"}},{"id":"c","text":{"fr":"Louis XIV","en":"Louis XIV"}},{"id":"d","text":{"fr":"Charles V","en":"Charles V"}}]}',
   '{"answer":"c"}'),
  ('77777777-7777-4777-8777-777777770206', '44444444-4444-4444-8444-444444444412', 5,
   'En 1793, le Louvre devient… ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"En 1793, le Louvre devient… ?","en":"In 1793, the Louvre became…?"},
     "choices":[{"id":"a","text":{"fr":"une caserne","en":"a barracks"}},{"id":"b","text":{"fr":"un musée public","en":"a public museum"}},{"id":"c","text":{"fr":"une bibliothèque","en":"a library"}},{"id":"d","text":{"fr":"un opéra","en":"an opera house"}}]}',
   '{"answer":"b"}'),
  -- ===== OR (Q1–Q8) =========================================================
  ('77777777-7777-4777-8777-777777770301', '44444444-4444-4444-8444-444444444413', 0,
   'Quel roi a transformé le Louvre de forteresse médiévale en palais Renaissance ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quel roi a transformé le Louvre de forteresse médiévale en palais Renaissance ?","en":"Which king turned the Louvre from a medieval fortress into a Renaissance palace?"},
     "choices":[{"id":"a","text":{"fr":"François Iᵉʳ","en":"François I"}},{"id":"b","text":{"fr":"Louis XIV","en":"Louis XIV"}},{"id":"c","text":{"fr":"Napoléon Iᵉʳ","en":"Napoleon I"}},{"id":"d","text":{"fr":"Henri IV","en":"Henri IV"}}]}',
   '{"answer":"a"}'),
  ('77777777-7777-4777-8777-777777770302', '44444444-4444-4444-8444-444444444413', 1,
   'Qui a conçu la pyramide de verre du Louvre ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Qui a conçu la pyramide de verre du Louvre ?","en":"Who designed the Louvre''s glass pyramid?"},
     "choices":[{"id":"a","text":{"fr":"Gustave Eiffel","en":"Gustave Eiffel"}},{"id":"b","text":{"fr":"Ieoh Ming Pei","en":"Ieoh Ming Pei"}},{"id":"c","text":{"fr":"Le Corbusier","en":"Le Corbusier"}},{"id":"d","text":{"fr":"Jean Nouvel","en":"Jean Nouvel"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770303', '44444444-4444-4444-8444-444444444413', 2,
   'En quelle année la pyramide a-t-elle été inaugurée ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"En quelle année la pyramide a-t-elle été inaugurée ?","en":"In what year was the pyramid inaugurated?"},
     "choices":[{"id":"a","text":{"fr":"1968","en":"1968"}},{"id":"b","text":{"fr":"1979","en":"1979"}},{"id":"c","text":{"fr":"1989","en":"1989"}},{"id":"d","text":{"fr":"1999","en":"1999"}}]}',
   '{"answer":"c"}'),
  ('77777777-7777-4777-8777-777777770304', '44444444-4444-4444-8444-444444444413', 3,
   'Quelle déesse la « Vénus de Milo » représente-t-elle ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quelle déesse la « Vénus de Milo » représente-t-elle ?","en":"Which goddess does the ''Venus de Milo'' depict?"},
     "choices":[{"id":"a","text":{"fr":"Athéna","en":"Athena"}},{"id":"b","text":{"fr":"Aphrodite","en":"Aphrodite"}},{"id":"c","text":{"fr":"Artémis","en":"Artemis"}},{"id":"d","text":{"fr":"Héra","en":"Hera"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770305', '44444444-4444-4444-8444-444444444413', 4,
   'Quel roi quitte le Louvre pour Versailles en 1682, y laissant la cour exsangue ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"Quel roi quitte le Louvre pour Versailles en 1682, y laissant la cour exsangue ?","en":"Which king left the Louvre for Versailles in 1682?"},
     "choices":[{"id":"a","text":{"fr":"Louis XIII","en":"Louis XIII"}},{"id":"b","text":{"fr":"François Iᵉʳ","en":"François I"}},{"id":"c","text":{"fr":"Louis XIV","en":"Louis XIV"}},{"id":"d","text":{"fr":"Charles V","en":"Charles V"}}]}',
   '{"answer":"c"}'),
  ('77777777-7777-4777-8777-777777770306', '44444444-4444-4444-8444-444444444413', 5,
   'En 1793, le Louvre devient… ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"En 1793, le Louvre devient… ?","en":"In 1793, the Louvre became…?"},
     "choices":[{"id":"a","text":{"fr":"une caserne","en":"a barracks"}},{"id":"b","text":{"fr":"un musée public","en":"a public museum"}},{"id":"c","text":{"fr":"une bibliothèque","en":"a library"}},{"id":"d","text":{"fr":"un opéra","en":"an opera house"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770307', '44444444-4444-4444-8444-444444444413', 6,
   '« La Liberté guidant le peuple » de Delacroix commémore quelle révolution ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"« La Liberté guidant le peuple » de Delacroix commémore quelle révolution ?","en":"Delacroix''s ''Liberty Leading the People'' commemorates which revolution?"},
     "choices":[{"id":"a","text":{"fr":"1789","en":"1789"}},{"id":"b","text":{"fr":"1830","en":"1830"}},{"id":"c","text":{"fr":"1848","en":"1848"}},{"id":"d","text":{"fr":"1871","en":"1871"}}]}',
   '{"answer":"b"}'),
  ('77777777-7777-4777-8777-777777770308', '44444444-4444-4444-8444-444444444413', 7,
   'En 1911, un événement rend la Joconde mondialement célèbre. Lequel ?',
   '{"kind":"quiz","points":10,
     "question":{"fr":"En 1911, un événement rend la Joconde mondialement célèbre. Lequel ?","en":"In 1911, one event made the Mona Lisa world-famous. Which?"},
     "choices":[{"id":"a","text":{"fr":"son vol","en":"its theft"}},{"id":"b","text":{"fr":"un incendie","en":"a fire"}},{"id":"c","text":{"fr":"sa vente","en":"its sale"}},{"id":"d","text":{"fr":"sa restauration","en":"its restoration"}}]}',
   '{"answer":"a"}')
on conflict (id) do update
  set payload    = excluded.payload,
      answer_key = excluded.answer_key,
      prompt     = excluded.prompt,
      position   = excluded.position;
