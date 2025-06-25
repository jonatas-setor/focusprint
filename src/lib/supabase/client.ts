import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Handle missing environment variables during build
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Using placeholder values for build.');
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Para uso em componentes client
export const supabase = createClient()
