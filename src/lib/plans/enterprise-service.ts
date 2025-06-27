// Enterprise plan service for FocuSprint
// Handles custom pricing, enterprise features, and specialized requirements

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface EnterpriseQuote {
  id: string;
  client_id: string;
  contact_email: string;
  company_name: string;
  estimated_users: number;
  estimated_projects: number;
  storage_requirements_gb: number;
  required_features: string[];
  compliance_requirements: string[];
  sla_requirements: {
    uptime_percent: number;
    response_time_minutes: number;
    support_level: string;
  };
  custom_integrations: string[];
  deployment_type: 'cloud' | 'on_premise' | 'hybrid';
  contract_duration_months: number;
  estimated_monthly_price: number;
  setup_fee: number;
  status: 'draft' | 'sent' | 'negotiating' | 'approved' | 'rejected';
  valid_until: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  notes: string;
}

export interface EnterpriseFeatures {
  // Core Enterprise Features
  unlimited_users: boolean;
  unlimited_projects: boolean;
  unlimited_storage: boolean;
  
  // Security & Compliance
  sso_saml: boolean;
  two_factor_mandatory: boolean;
  audit_logs: boolean;
  compliance_reporting: boolean;
  data_encryption: boolean;
  
  // Infrastructure
  isolated_environment: boolean;
  dedicated_resources: boolean;
  custom_domain: boolean;
  white_labeling: boolean;
  
  // Support & SLA
  dedicated_support: boolean;
  support_24_7: boolean;
  custom_sla: boolean;
  priority_escalation: boolean;
  
  // Customization
  custom_integrations: boolean;
  custom_development: boolean;
  api_access_unlimited: boolean;
  custom_reporting: boolean;
  
  // Backup & Recovery
  automated_backups: boolean;
  disaster_recovery: boolean;
  data_retention_custom: boolean;
}

export class EnterpriseService {
  /**
   * Get Enterprise plan details
   */
  static async getEnterprisePlan() {
    const supabase = await createClient();

    try {
      const { data: plan, error } = await supabase
        .from('plans')
        .select('*')
        .eq('code', 'enterprise')
        .single();

      if (error || !plan) {
        throw new Error('Enterprise plan not found');
      }

      return plan;

    } catch (error) {
      logger.error('Failed to get Enterprise plan', error instanceof Error ? error : new Error('Unknown error'), 'ENTERPRISE');
      throw error;
    }
  }

  /**
   * Create enterprise quote request
   */
  static async createQuoteRequest(quoteData: Omit<EnterpriseQuote, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<EnterpriseQuote> {
    const supabase = await createClient();

    try {
      // Calculate estimated pricing based on requirements
      const estimatedPrice = this.calculateEstimatedPricing(quoteData);

      const { data: quote, error } = await supabase
        .from('enterprise_quotes')
        .insert([{
          ...quoteData,
          estimated_monthly_price: estimatedPrice.monthly,
          setup_fee: estimatedPrice.setup,
          status: 'draft',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create quote request: ${error.message}`);
      }

      logger.info('Created enterprise quote request', 'ENTERPRISE', {
        quote_id: quote.id,
        company: quoteData.company_name,
        estimated_users: quoteData.estimated_users
      });

      return quote;

    } catch (error) {
      logger.error('Failed to create enterprise quote', error instanceof Error ? error : new Error('Unknown error'), 'ENTERPRISE');
      throw error;
    }
  }

  /**
   * Calculate estimated pricing for enterprise plan
   */
  static calculateEstimatedPricing(requirements: Partial<EnterpriseQuote>): { monthly: number, setup: number } {
    let basePrice = 2000; // Base R$2000/month for enterprise
    let setupFee = 5000; // Base R$5000 setup

    // User-based pricing
    if (requirements.estimated_users) {
      if (requirements.estimated_users > 100) {
        basePrice += (requirements.estimated_users - 100) * 15; // R$15 per additional user over 100
      }
    }

    // Storage-based pricing
    if (requirements.storage_requirements_gb && requirements.storage_requirements_gb > 100) {
      basePrice += Math.ceil((requirements.storage_requirements_gb - 100) / 10) * 50; // R$50 per 10GB over 100GB
    }

    // Feature-based pricing
    if (requirements.required_features) {
      const premiumFeatures = [
        'isolated_environment',
        'custom_development',
        'on_premise_deployment',
        'disaster_recovery',
        'custom_integrations'
      ];

      const premiumCount = requirements.required_features.filter(f => 
        premiumFeatures.includes(f)
      ).length;

      basePrice += premiumCount * 500; // R$500 per premium feature
    }

    // Deployment type pricing
    if (requirements.deployment_type === 'on_premise') {
      basePrice += 3000; // Additional R$3000 for on-premise
      setupFee += 10000; // Additional R$10000 setup for on-premise
    } else if (requirements.deployment_type === 'hybrid') {
      basePrice += 1500; // Additional R$1500 for hybrid
      setupFee += 5000; // Additional R$5000 setup for hybrid
    }

    // SLA-based pricing
    if (requirements.sla_requirements?.uptime_percent && requirements.sla_requirements.uptime_percent > 99.9) {
      basePrice += 1000; // Premium SLA
    }

    // Contract duration discount
    if (requirements.contract_duration_months && requirements.contract_duration_months >= 12) {
      basePrice *= 0.9; // 10% discount for annual contracts
    }

    return {
      monthly: Math.round(basePrice),
      setup: setupFee
    };
  }

  /**
   * Get enterprise features configuration
   */
  static getEnterpriseFeatures(): EnterpriseFeatures {
    return {
      // Core Enterprise Features
      unlimited_users: true,
      unlimited_projects: true,
      unlimited_storage: true,
      
      // Security & Compliance
      sso_saml: true,
      two_factor_mandatory: true,
      audit_logs: true,
      compliance_reporting: true,
      data_encryption: true,
      
      // Infrastructure
      isolated_environment: true,
      dedicated_resources: true,
      custom_domain: true,
      white_labeling: true,
      
      // Support & SLA
      dedicated_support: true,
      support_24_7: true,
      custom_sla: true,
      priority_escalation: true,
      
      // Customization
      custom_integrations: true,
      custom_development: true,
      api_access_unlimited: true,
      custom_reporting: true,
      
      // Backup & Recovery
      automated_backups: true,
      disaster_recovery: true,
      data_retention_custom: true
    };
  }

  /**
   * List enterprise quote requests
   */
  static async listQuoteRequests(filters?: {
    status?: string;
    company_name?: string;
    limit?: number;
  }) {
    const supabase = await createClient();

    try {
      let query = supabase
        .from('enterprise_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.company_name) {
        query = query.ilike('company_name', `%${filters.company_name}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data: quotes, error } = await query;

      if (error) {
        throw new Error(`Failed to list quote requests: ${error.message}`);
      }

      return quotes || [];

    } catch (error) {
      logger.error('Failed to list enterprise quotes', error instanceof Error ? error : new Error('Unknown error'), 'ENTERPRISE');
      throw error;
    }
  }

  /**
   * Update quote status
   */
  static async updateQuoteStatus(quoteId: string, status: EnterpriseQuote['status'], notes?: string) {
    const supabase = await createClient();

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.notes = notes;
      }

      const { data: quote, error } = await supabase
        .from('enterprise_quotes')
        .update(updateData)
        .eq('id', quoteId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update quote status: ${error.message}`);
      }

      logger.info('Updated enterprise quote status', 'ENTERPRISE', {
        quote_id: quoteId,
        status,
        notes: notes ? 'with notes' : 'no notes'
      });

      return quote;

    } catch (error) {
      logger.error('Failed to update quote status', error instanceof Error ? error : new Error('Unknown error'), 'ENTERPRISE');
      throw error;
    }
  }
}
