import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Typed client. Env is read at build time; see .env.example. */
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
);
