// Tipos do Database Supabase - FocuSprint
export interface Database {
  public: {
    Tables: {
      admin_profiles: {
        Row: AdminProfile
        Insert: AdminProfileInsert
        Update: AdminProfileUpdate
      }
      plans: {
        Row: Plan
        Insert: PlanInsert
        Update: PlanUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
  platform_admin: {
    Tables: {
      licenses: {
        Row: License
        Insert: LicenseInsert
        Update: LicenseUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
  client_data: {
    Tables: {
      clients: {
        Row: Client
        Insert: ClientInsert
        Update: ClientUpdate
      }
      client_profiles: {
        Row: ClientProfile
        Insert: ClientProfileInsert
        Update: ClientProfileUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Platform Admin Types
export interface AdminProfile {
  id: string
  user_id: string | null
  role: string
  first_name: string
  last_name: string
  // 2FA fields
  two_factor_enabled: boolean
  two_factor_secret: string | null
  two_factor_backup_codes: string[] | null
  created_at: string | null
  updated_at: string | null
}

export interface AdminProfileInsert {
  id?: string
  user_id?: string | null
  role?: string
  first_name: string
  last_name: string
  // 2FA fields
  two_factor_enabled?: boolean
  two_factor_secret?: string | null
  two_factor_backup_codes?: string[] | null
  created_at?: string | null
  updated_at?: string | null
}

export interface AdminProfileUpdate {
  id?: string
  user_id?: string | null
  role?: string
  first_name?: string
  last_name?: string
  // 2FA fields
  two_factor_enabled?: boolean
  two_factor_secret?: string | null
  two_factor_backup_codes?: string[] | null
  created_at?: string | null
  updated_at?: string | null
}

// Client Types
export interface Client {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'suspended'
  plan_type: 'free' | 'pro' | 'business'
  max_users: number
  max_projects: number
  stripe_customer_id: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ClientInsert {
  id?: string
  name: string
  email: string
  status?: 'active' | 'inactive' | 'suspended'
  plan_type?: 'free' | 'pro' | 'business'
  max_users?: number
  max_projects?: number
  stripe_customer_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ClientUpdate {
  id?: string
  name?: string
  email?: string
  status?: 'active' | 'inactive' | 'suspended'
  plan_type?: 'free' | 'pro' | 'business'
  max_users?: number
  max_projects?: number
  stripe_customer_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// Client Profile Types
export interface ClientProfile {
  id: string
  user_id: string | null
  client_id: string | null
  role: 'owner' | 'admin' | 'member'
  first_name: string
  last_name: string
  google_account_connected: boolean | null
  google_refresh_token: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ClientProfileInsert {
  id?: string
  user_id?: string | null
  client_id?: string | null
  role?: 'owner' | 'admin' | 'member'
  first_name: string
  last_name: string
  google_account_connected?: boolean | null
  google_refresh_token?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ClientProfileUpdate {
  id?: string
  user_id?: string | null
  client_id?: string | null
  role?: 'owner' | 'admin' | 'member'
  first_name?: string
  last_name?: string
  google_account_connected?: boolean | null
  google_refresh_token?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// Plan Types (already exist in licenses service, but adding here for completeness)
export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  price: number
  currency: string
  interval: string
  features: Record<string, any>
  limits: Record<string, any>
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface PlanInsert {
  id?: string
  code: string
  name: string
  description?: string | null
  price: number
  currency?: string
  interval?: string
  features?: Record<string, any>
  limits?: Record<string, any>
  is_active?: boolean
  version?: number
  created_at?: string
  updated_at?: string
}

export interface PlanUpdate {
  id?: string
  code?: string
  name?: string
  description?: string | null
  price?: number
  currency?: string
  interval?: string
  features?: Record<string, any>
  limits?: Record<string, any>
  is_active?: boolean
  version?: number
  created_at?: string
  updated_at?: string
}

// License Types (already exist in licenses service, but adding here for completeness)
export interface License {
  id: string
  client_id: string | null
  plan_id: string | null
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'
  start_date: string | null
  end_date: string | null
  trial_ends_at: string | null
  metadata: Record<string, any> | null
  created_at: string | null
  updated_at: string | null
}

export interface LicenseInsert {
  id?: string
  client_id?: string | null
  plan_id?: string | null
  status?: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'
  start_date?: string | null
  end_date?: string | null
  trial_ends_at?: string | null
  metadata?: Record<string, any> | null
  created_at?: string | null
  updated_at?: string | null
}

export interface LicenseUpdate {
  id?: string
  client_id?: string | null
  plan_id?: string | null
  status?: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'
  start_date?: string | null
  end_date?: string | null
  trial_ends_at?: string | null
  metadata?: Record<string, any> | null
  created_at?: string | null
  updated_at?: string | null
}

// Client Data Types (será implementado na Semana 2)
export interface Client {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'suspended'
  plan_type: 'free' | 'pro' | 'business'
  max_users: number
  max_projects: number
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  client_id: string
  role: 'owner' | 'admin' | 'member'
  first_name: string
  last_name: string
  google_account_connected: boolean
  google_refresh_token?: string
  created_at: string
  updated_at: string
}
