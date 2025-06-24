// Tipos específicos do Supabase para FocuSprint

export interface SupabaseResponse<T> {
  data: T | null
  error: Error | null
}

export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
}

// Tipos para autenticação
export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: SupabaseUser
}

// Tipos para RLS (Row Level Security)
export interface RLSContext {
  user_id: string
  email: string
  role?: string
}

// Tipos para Platform Admin
export interface AdminAuthContext extends RLSContext {
  role: 'admin' | 'super_admin'
  email: string // Deve terminar com @focusprint.com
}

// Tipos para Client Dashboard
export interface ClientAuthContext extends RLSContext {
  client_id: string
  role: 'owner' | 'admin' | 'member'
  license_active: boolean
}
