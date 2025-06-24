import { createBrowserClient } from '@supabase/ssr';

// Create Supabase browser client
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Re-export types and utilities from server
export type { ClientProfile } from './server';
export { hasRole, canPerformAction } from './server';


