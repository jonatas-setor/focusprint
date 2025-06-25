import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export const createClient = async () => {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Handle missing environment variables during build
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Using placeholder values for build.');
    return createServerClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No-op during build
          },
        },
      }
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Para uso em Server Components e API Routes
// Note: Use createClient() directly in async functions

// Cliente com service role para operações administrativas
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Handle missing environment variables during build
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase admin environment variables not found. Using placeholder values for build.');
    return createServerClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-service-key',
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No-op for service role client
          },
        },
      }
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for service role client
        },
      },
    }
  )
}
