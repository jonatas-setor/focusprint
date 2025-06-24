import { supabase } from '@/lib/supabase/client';

// Plan interface matching public.plans table
export interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// Enhanced License interface with plan references and client data
export interface License {
  id: string;
  client_id?: string;
  plan_id?: string;
  plan_type: string;
  plan_name?: string;
  plan_price?: number;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  max_users: number;
  max_projects: number;
  stripe_subscription_id?: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Enhanced fields from API
  client_name?: string;
  current_users?: number;
  current_projects?: number;
  usage_users?: string;
  usage_projects?: string;
}

export interface CreateLicenseData {
  plan_id?: string;
  plan_type?: 'free' | 'pro' | 'business';
  status?: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  max_users?: number;
  max_projects?: number;
  client_id?: string;
  stripe_subscription_id?: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  metadata?: Record<string, any>;
}

export interface UpdateLicenseData {
  plan_id?: string;
  plan_type?: 'free' | 'pro' | 'business';
  status?: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  max_users?: number;
  max_projects?: number;
  stripe_subscription_id?: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  metadata?: Record<string, any>;
}

export class PlanService {
  /**
   * Get all active plans
   */
  static async getAllPlans(): Promise<Plan[]> {
    const { data, error } = await supabase.rpc('get_all_plans');

    if (error) {
      console.error('Error fetching plans:', error);
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(id: string): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching plan:', error);
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Get plan by code
   */
  static async getPlanByCode(code: string): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching plan by code:', error);
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Create new plan
   */
  static async createPlan(planData: Omit<Plan, 'id' | 'created_at' | 'updated_at'>): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .insert([planData])
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      throw new Error(`Failed to create plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Update plan
   */
  static async updatePlan(id: string, updates: Partial<Plan>): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plan:', error);
      throw new Error(`Failed to update plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Deactivate plan
   */
  static async deactivatePlan(id: string): Promise<Plan> {
    return this.updatePlan(id, { is_active: false });
  }
}

export class LicenseService {
  /**
   * Get all licenses with enhanced client information
   */
  static async getAllLicenses(): Promise<License[]> {
    try {
      const response = await fetch('/api/admin/licenses');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.licenses || [];
    } catch (error) {
      console.error('Error fetching licenses:', error);
      throw new Error(`Failed to fetch licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get license by ID
   */
  static async getLicenseById(id: string): Promise<License | null> {
    const { data, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // License not found
      }
      console.error('Error fetching license:', error);
      throw new Error(`Failed to fetch license: ${error.message}`);
    }

    return data;
  }

  /**
   * Create new license with plan reference
   */
  static async createLicense(licenseData: CreateLicenseData): Promise<License> {
    // If plan_type is provided but not plan_id, resolve plan_id
    if (licenseData.plan_type && !licenseData.plan_id) {
      const plan = await PlanService.getPlanByCode(licenseData.plan_type);
      licenseData.plan_id = plan.id;

      // Set limits from plan if not provided
      if (!licenseData.max_users) {
        licenseData.max_users = plan.limits.max_users;
      }
      if (!licenseData.max_projects) {
        licenseData.max_projects = plan.limits.max_projects;
      }
    }

    // Set default dates
    if (!licenseData.start_date) {
      licenseData.start_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .insert([licenseData])
      .select()
      .single();

    if (error) {
      console.error('Error creating license:', error);
      throw new Error(`Failed to create license: ${error.message}`);
    }

    return data;
  }

  /**
   * Update license
   */
  static async updateLicense(id: string, updates: UpdateLicenseData): Promise<License> {
    const { data, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating license:', error);
      throw new Error(`Failed to update license: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete license
   */
  static async deleteLicense(id: string): Promise<void> {
    const { error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting license:', error);
      throw new Error(`Failed to delete license: ${error.message}`);
    }
  }

  /**
   * Get enhanced license statistics
   */
  static async getLicenseStats() {
    const { data, error } = await supabase.rpc('get_enhanced_license_stats');

    if (error) {
      console.error('Error fetching license stats:', error);
      throw new Error(`Failed to fetch license stats: ${error.message}`);
    }

    return data || {
      total: 0,
      active: 0,
      trial: 0,
      suspended: 0,
      plan_distribution: {},
      mrr: 0
    };
  }

  /**
   * Suspend license
   */
  static async suspendLicense(id: string): Promise<License> {
    return this.updateLicense(id, { status: 'suspended' });
  }

  /**
   * Activate license
   */
  static async activateLicense(id: string): Promise<License> {
    return this.updateLicense(id, { status: 'active' });
  }

  /**
   * Extend trial period
   */
  static async extendTrial(id: string, days: number = 30): Promise<License> {
    const extendedDate = new Date();
    extendedDate.setDate(extendedDate.getDate() + days);

    return this.updateLicense(id, {
      trial_ends_at: extendedDate.toISOString(),
      status: 'trial'
    });
  }

  /**
   * Change license plan using plan references
   */
  static async changePlan(id: string, newPlanCode: 'free' | 'pro' | 'business'): Promise<License> {
    // Get the new plan details
    const newPlan = await PlanService.getPlanByCode(newPlanCode);

    return this.updateLicense(id, {
      plan_id: newPlan.id,
      plan_type: newPlan.code,
      max_users: newPlan.limits.max_users,
      max_projects: newPlan.limits.max_projects
    });
  }

  /**
   * Change license plan by plan ID
   */
  static async changePlanById(id: string, planId: string): Promise<License> {
    // Get the new plan details
    const newPlan = await PlanService.getPlanById(planId);

    return this.updateLicense(id, {
      plan_id: newPlan.id,
      plan_type: newPlan.code,
      max_users: newPlan.limits.max_users,
      max_projects: newPlan.limits.max_projects
    });
  }
}
