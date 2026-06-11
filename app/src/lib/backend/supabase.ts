import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ArcadiaBackend, AttemptResult, BackendUser, CheckInResult, LeaderboardEntry, StationProgress,
} from './types';

export class SupabaseBackend implements ArcadiaBackend {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey);
  }

  private toUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): BackendUser | null {
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      displayName: (u.user_metadata?.display_name as string) ?? u.email?.split('@')[0] ?? 'Voyageur',
    };
  }

  async getUser(): Promise<BackendUser | null> {
    const { data } = await this.sb.auth.getSession();
    return this.toUser(data.session?.user ?? null);
  }

  onAuthChange(cb: (user: BackendUser | null) => void): () => void {
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => {
      cb(this.toUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  }

  async signUp(email: string, password: string, displayName: string): Promise<{ error?: string }> {
    const { data, error } = await this.sb.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    // Le trigger d'auto-provisionnement est désactivé en 0004 : on crée le
    // profil players nous-mêmes (RLS : insert de son propre id autorisé).
    if (data.user) {
      await this.sb.from('players')
        .insert({ id: data.user.id, display_name: displayName })
        .then(({ error: e }) => {
          // 23505 = profil déjà créé (re-signup) : bénin
          if (e && e.code !== '23505') console.warn('players insert:', e.message);
        });
    }
    return {};
  }

  async signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  async submitAttempt(questId: string, answers: Record<string, unknown>, durationMs: number): Promise<AttemptResult> {
    const { data, error } = await this.sb.rpc('fn_submit_attempt', {
      p_quest_id: questId,
      p_answers: answers,
      p_duration_ms: Math.round(durationMs),
    });
    if (error) throw new Error(error.message);
    return {
      attemptId: data.attempt_id ?? null,
      score: data.score ?? 0,
      success: !!data.success,
      xpGained: data.xp_gained ?? 0,
      mastery: data.mastery ?? 0,
      flagged: !!data.flagged,
    };
  }

  async checkIn(stationId: string, method: 'manual'): Promise<CheckInResult> {
    const { data: session } = await this.sb.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) return { ok: false, error: 'auth_required' };
    // INSERT direct : confidence/expires_at/created_at sont IMPOSÉS par les
    // triggers serveur (0010), le cooldown anti-téléportation par 0004.
    const { error } = await this.sb.from('check_ins')
      .insert({ player_id: uid, station_id: stationId, method });
    if (error) {
      if (error.message.includes('COOLDOWN_VIOLATION')) return { ok: false, error: 'cooldown', cooldownS: 90 };
      return { ok: false, error: 'error' };
    }
    const active = await this.getActiveCheckIn(stationId);
    return { ok: true, expiresAt: active?.expiresAt };
  }

  async getActiveCheckIn(stationId: string): Promise<{ expiresAt: string } | null> {
    const { data: session } = await this.sb.auth.getSession();
    if (!session.session) return null;
    const { data } = await this.sb.from('check_ins')
      .select('expires_at')
      .eq('station_id', stationId)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? { expiresAt: data.expires_at } : null;
  }

  async getLineLeaderboard(lineId: string): Promise<LeaderboardEntry[]> {
    const me = (await this.getUser())?.id;
    const { data, error } = await this.sb.from('leaderboard_entries')
      .select('player_id, display_name, rank, score')
      .eq('scope', 'line')
      .eq('line_id', lineId)
      .order('rank', { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      playerId: r.player_id,
      displayName: r.display_name,
      rank: r.rank,
      score: r.score,
      isMe: r.player_id === me,
    }));
  }

  async getMyStationProgress(stationId: string): Promise<StationProgress | null> {
    const { data: session } = await this.sb.auth.getSession();
    if (!session.session) return null;
    const { data } = await this.sb.from('player_station_progress')
      .select('state, mastery_score')
      .eq('station_id', stationId)
      .maybeSingle();
    return data ? { state: data.state, masteryScore: data.mastery_score } : null;
  }

  async getMyStats(): Promise<{ xpTotal: number; streak: number } | null> {
    const { data: session } = await this.sb.auth.getSession();
    if (!session.session) return null;
    const { data } = await this.sb.from('players')
      .select('xp_total, streak_count')
      .eq('id', session.session.user.id)
      .maybeSingle();
    return data ? { xpTotal: data.xp_total, streak: data.streak_count } : null;
  }
}
