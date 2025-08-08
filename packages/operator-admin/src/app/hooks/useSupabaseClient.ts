'use client';

import { useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const useSupabaseClient = (): SupabaseClient => {
  return useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }, []);
};
