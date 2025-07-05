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
      setup_fee_history: {
        Row: SetupFeeHistory
        Insert: SetupFeeHistoryInsert
        Update: SetupFeeHistoryUpdate
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
  cnpj: string | null
  phone: string | null
  address: string | null
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
  cnpj?: string | null
  phone?: string | null
  address?: string | null
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
  cnpj?: string | null
  phone?: string | null
  address?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// Keyboard Shortcuts Configuration Types
export interface ShortcutsConfig {
  enabled: boolean
  custom_shortcuts: {
    new_task?: string
    focus_chat?: string
    command_palette?: string
    project_switcher?: string
    new_project?: string
    [key: string]: string | undefined
  }
  disabled_shortcuts: string[]
}

export interface UserPreferences {
  shortcuts_config?: ShortcutsConfig
  ui_preferences?: {
    theme?: 'light' | 'dark' | 'system'
    sidebar_collapsed?: boolean
    kanban_column_width?: 'small' | 'medium' | 'large'
  }
  notification_settings?: {
    email_notifications?: boolean
    browser_notifications?: boolean
    task_assignments?: boolean
    project_updates?: boolean
  }
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
  preferences: UserPreferences | null
  timezone: string | null
  language: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
  last_seen_at: string | null
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
  preferences?: UserPreferences | null
  timezone?: string | null
  language?: string | null
  avatar_url?: string | null
  job_title?: string | null
  department?: string | null
  last_seen_at?: string | null
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
  preferences?: UserPreferences | null
  timezone?: string | null
  language?: string | null
  avatar_url?: string | null
  job_title?: string | null
  department?: string | null
  last_seen_at?: string | null
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
  annual_price_cents?: number | null
  annual_discount_percent?: number | null
  has_annual_discount?: boolean
  setup_fee_cents?: number | null
  trial_days?: number | null
  price_per_additional_user_cents?: number | null
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
  annual_price_cents?: number | null
  annual_discount_percent?: number | null
  has_annual_discount?: boolean
  setup_fee_cents?: number | null
  trial_days?: number | null
  price_per_additional_user_cents?: number | null
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
  setup_fee_cents?: number | null
  trial_days?: number | null
  price_per_additional_user_cents?: number | null
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
  current_users: number
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
  current_users?: number
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
  current_users?: number
  metadata?: Record<string, any> | null
  created_at?: string | null
  updated_at?: string | null
}

// Client Data Types (será implementado na Semana 2)
// Note: Client interface is defined above in the main types section
// ClientProfile interface is already defined above with full schema

// Setup Fee History Types
export interface SetupFeeHistory {
  id: string
  client_id: string | null
  plan_id: string | null
  setup_fee_amount: number
  currency: string
  stripe_payment_intent_id: string | null
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface SetupFeeHistoryInsert {
  id?: string
  client_id?: string | null
  plan_id?: string | null
  setup_fee_amount: number
  currency?: string
  stripe_payment_intent_id?: string | null
  status?: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface SetupFeeHistoryUpdate {
  id?: string
  client_id?: string | null
  plan_id?: string | null
  setup_fee_amount?: number
  currency?: string
  stripe_payment_intent_id?: string | null
  status?: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}
