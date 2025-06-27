// Plan versioning service for FocuSprint
// Manages plan versions and history

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface PlanVersion {
  id: string;
  plan_id: string;
  version: number;
  changes_summary: string;
  plan_data: any;
  created_at: string;
  created_by: string | null;
  is_current: boolean;
}

export interface VersionDiff {
  field: string;
  old_value: any;
  new_value: any;
  change_type: 'added' | 'modified' | 'removed';
}

export class PlanVersionService {
  /**
   * Create a new version of a plan
   */
  static async createVersion(
    planId: string,
    planData: any,
    changesSummary: string,
    createdBy: string
  ): Promise<PlanVersion> {
    const supabase = await createClient();

    try {
      // Get current version number
      const { data: currentVersion } = await supabase
        .from('plan_versions')
        .select('version')
        .eq('plan_id', planId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const newVersionNumber = (currentVersion?.version || 0) + 1;

      // Mark all previous versions as not current
      await supabase
        .from('plan_versions')
        .update({ is_current: false })
        .eq('plan_id', planId);

      // Create new version
      const { data: newVersion, error } = await supabase
        .from('plan_versions')
        .insert([{
          plan_id: planId,
          version: newVersionNumber,
          changes_summary: changesSummary,
          plan_data: planData,
          created_by: createdBy,
          is_current: true
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create plan version: ${error.message}`);
      }

      logger.info(`Plan version created: ${planId} v${newVersionNumber}`, 'PLAN_VERSION', {
        planId,
        version: newVersionNumber,
        createdBy
      });

      return newVersion;

    } catch (error) {
      logger.error('Failed to create plan version', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_VERSION', {
        planId,
        createdBy
      });
      throw error;
    }
  }

  /**
   * Get all versions of a plan
   */
  static async getPlanVersions(planId: string): Promise<PlanVersion[]> {
    const supabase = await createClient();

    try {
      const { data: versions, error } = await supabase
        .from('plan_versions')
        .select('*')
        .eq('plan_id', planId)
        .order('version', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch plan versions: ${error.message}`);
      }

      return versions || [];

    } catch (error) {
      logger.error('Failed to fetch plan versions', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_VERSION', {
        planId
      });
      throw error;
    }
  }

  /**
   * Get current version of a plan
   */
  static async getCurrentVersion(planId: string): Promise<PlanVersion | null> {
    const supabase = await createClient();

    try {
      const { data: version, error } = await supabase
        .from('plan_versions')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch current plan version: ${error.message}`);
      }

      return version;

    } catch (error) {
      logger.error('Failed to fetch current plan version', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_VERSION', {
        planId
      });
      throw error;
    }
  }

  /**
   * Get specific version of a plan
   */
  static async getVersion(planId: string, version: number): Promise<PlanVersion | null> {
    const supabase = await createClient();

    try {
      const { data: planVersion, error } = await supabase
        .from('plan_versions')
        .select('*')
        .eq('plan_id', planId)
        .eq('version', version)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch plan version: ${error.message}`);
      }

      return planVersion;

    } catch (error) {
      logger.error('Failed to fetch plan version', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_VERSION', {
        planId,
        version
      });
      throw error;
    }
  }

  /**
   * Compare two versions and get differences
   */
  static compareVersions(oldVersion: PlanVersion, newVersion: PlanVersion): VersionDiff[] {
    const diffs: VersionDiff[] = [];
    const oldData = oldVersion.plan_data;
    const newData = newVersion.plan_data;

    // Get all unique keys from both versions
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {})
    ]);

    for (const key of allKeys) {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      if (oldValue === undefined && newValue !== undefined) {
        diffs.push({
          field: key,
          old_value: null,
          new_value: newValue,
          change_type: 'added'
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        diffs.push({
          field: key,
          old_value: oldValue,
          new_value: null,
          change_type: 'removed'
        });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diffs.push({
          field: key,
          old_value: oldValue,
          new_value: newValue,
          change_type: 'modified'
        });
      }
    }

    return diffs;
  }

  /**
   * Rollback to a specific version
   */
  static async rollbackToVersion(
    planId: string,
    targetVersion: number,
    rollbackReason: string,
    performedBy: string
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // Get the target version data
      const targetVersionData = await this.getVersion(planId, targetVersion);
      if (!targetVersionData) {
        throw new Error(`Version ${targetVersion} not found for plan ${planId}`);
      }

      // Update the main plan with the target version data
      const { error: updateError } = await supabase
        .from('plans')
        .update({
          ...targetVersionData.plan_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (updateError) {
        throw new Error(`Failed to rollback plan: ${updateError.message}`);
      }

      // Create a new version entry for the rollback
      await this.createVersion(
        planId,
        targetVersionData.plan_data,
        `Rollback to version ${targetVersion}: ${rollbackReason}`,
        performedBy
      );

      logger.info(`Plan rolled back: ${planId} to version ${targetVersion}`, 'PLAN_VERSION', {
        planId,
        targetVersion,
        rollbackReason,
        performedBy
      });

    } catch (error) {
      logger.error('Failed to rollback plan version', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_VERSION', {
        planId,
        targetVersion,
        performedBy
      });
      throw error;
    }
  }

  /**
   * Get version history summary
   */
  static async getVersionHistory(planId: string): Promise<{
    total_versions: number;
    current_version: number;
    first_created: string;
    last_updated: string;
    versions: PlanVersion[];
  }> {
    try {
      const versions = await this.getPlanVersions(planId);
      
      if (versions.length === 0) {
        throw new Error(`No versions found for plan ${planId}`);
      }

      const currentVersion = versions.find(v => v.is_current);
      
      return {
        total_versions: versions.length,
        current_version: currentVersion?.version || 0,
        first_created: versions[versions.length - 1]?.created_at || '',
        last_updated: versions[0]?.created_at || '',
        versions
      };

    } catch (error) {
      logger.error('Failed to get version history', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_VERSION', {
        planId
      });
      throw error;
    }
  }
}
