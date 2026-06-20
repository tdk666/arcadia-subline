import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Garde-fou RLS de la table `events` (migration 0014) — vérifiable sans base.
 * Doctrine : insert-only client (anon + authenticated), AUCUNE lecture/altération
 * côté client (l'analyse passe par service_role). Ce test échoue si une future
 * migration relâche la table (ex. policy SELECT) — la télémétrie ne doit jamais
 * devenir lisible/modifiable depuis le client.
 */

const sql = readFileSync(
  new URL('../../../supabase/migrations/20260620000014_events.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('events — RLS insert-only', () => {
  it('RLS activée sur la table', () => {
    expect(sql).toMatch(/alter table public\.events enable row level security/);
  });

  it('policy INSERT pour anon + authenticated', () => {
    expect(sql).toMatch(/for insert\s+to anon, authenticated/);
    expect(sql).toContain('with check (true)');
  });

  it('AUCUNE policy de lecture/écriture autre qu\'insert', () => {
    expect(sql).not.toMatch(/for select/);
    expect(sql).not.toMatch(/for update/);
    expect(sql).not.toMatch(/for delete/);
    expect(sql).not.toMatch(/for all/);
  });

  it('index funnel/rétention présents (name,server_ts) et (player_id,server_ts)', () => {
    expect(sql).toContain('(name, server_ts)');
    expect(sql).toContain('(player_id, server_ts)');
  });
});
