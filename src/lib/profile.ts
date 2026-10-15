import 'server-only';
import { cache } from 'react';
import { requireUser } from './supabase/server';
import type { Profile } from './types';

/** The signed-in user's profile, fetched once per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('profiles').select('*').maybeSingle<Profile>();
  return data;
});
