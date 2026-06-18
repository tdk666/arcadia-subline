-- =============================================================================
-- ARCADIA SUBLINE — Migration 0013 : auto-provisionnement du profil à l'inscription
-- Corrige « impossible de créer un compte » : sans ce trigger, la ligne players
-- était créée côté client, ce que la RLS bloque tant qu'aucune session n'existe
-- (cas email-confirmation ON). Ici, SECURITY DEFINER → bypass RLS, marche que
-- l'email soit confirmé ou non. Idempotent.
-- =============================================================================

create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Voyageur')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();
