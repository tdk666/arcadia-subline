import type { ArcadiaBackend } from './types';
import { SupabaseBackend } from './supabase';
import { DemoBackend } from './demo';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sélection au démarrage : clés présentes → Supabase, sinon mode démo. */
export const backend: ArcadiaBackend =
  url && anonKey ? new SupabaseBackend(url, anonKey) : new DemoBackend();

export * from './types';
