import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface MilestoneProgressUpdate {
  milestone_id: string
  old_progress: number
  new_progress: number
  task_count: number
  completed_tasks: number
  updated_at: string
}

export interface ProgressUpdateResult {
  success: boolean
  updated_milestones: MilestoneProgressUpdate[]
  errors: string[]
  total_processed: number
}

/**
 * Service for managing milestone progress updates
 */
export class MilestoneProgressService {
  
  /**
   * Update progress for a specific milestone
   */
  static async updateMilestoneProgress(milestoneId: string): Promise<ProgressUpdateResult> {
    try {
      const supabase = await createClient()
      
      // Get current milestone data
      const { data: milestone, error: milestoneError } = await supabase
        .from('project_milestones')
        .select(`
          id,
          name,
          project_id,
          progress_percentage,
          status
        `)
        .eq('id', milestoneId)
        .single()

      if (milestoneError || !milestone) {
        return {
          success: false,
          updated_milestones: [],
          errors: [`Milestone not found: ${milestoneId}`],
          total_processed: 0
        }
      }

      // Skip if milestone is completed or not started
      if (milestone.status === 'completed' || milestone.status === 'not_started') {
        return {
          success: true,
          updated_milestones: [],
          errors: [],
          total_processed: 0
        }
      }

      const oldProgress = milestone.progress_percentage || 0

      // Calculate new progress using RPC function
      const { data: progressData, error: progressError } = await supabase
        .rpc('calculate_milestone_progress', { milestone_uuid: milestoneId })

      if (progressError) {
        return {
          success: false,
          updated_milestones: [],
          errors: [`Failed to calculate progress: ${progressError.message}`],
          total_processed: 0
        }
      }

      const progressInfo = progressData?.[0]
      const newProgress = progressInfo?.progress_percentage || 0
      const totalTasks = progressInfo?.total_tasks || 0
      const completedTasks = progressInfo?.completed_tasks || 0

      // Only update if progress has changed
      if (oldProgress !== newProgress) {
        const now = new Date().toISOString()
        
        // Update milestone progress and status
        let newStatus = milestone.status
        if (newProgress === 100) {
          newStatus = 'completed'
        } else if (newProgress > 0 && milestone.status === 'not_started') {
          newStatus = 'in_progress'
        }

        const { error: updateError } = await supabase
          .from('project_milestones')
          .update({ 
            progress_percentage: newProgress,
            status: newStatus,
            updated_at: now
          })
          .eq('id', milestoneId)

        if (updateError) {
          return {
            success: false,
            updated_milestones: [],
            errors: [`Failed to update milestone: ${updateError.message}`],
            total_processed: 0
          }
        }

        logger.info(`Updated milestone ${milestone.name} progress: ${oldProgress}% -> ${newProgress}%`)

        return {
          success: true,
          updated_milestones: [{
            milestone_id: milestoneId,
            old_progress: oldProgress,
            new_progress: newProgress,
            task_count: totalTasks,
            completed_tasks: completedTasks,
            updated_at: now
          }],
          errors: [],
          total_processed: 1
        }
      }

      return {
        success: true,
        updated_milestones: [],
        errors: [],
        total_processed: 1
      }

    } catch (error) {
      return {
        success: false,
        updated_milestones: [],
        errors: [`Error updating milestone ${milestoneId}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        total_processed: 0
      }
    }
  }

  /**
   * Update milestones affected by a specific task
   */
  static async updateMilestonesForTask(taskId: string): Promise<ProgressUpdateResult> {
    try {
      const supabase = await createClient()

      // Get task and its milestone
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, milestone_id, project_id')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        return {
          success: false,
          updated_milestones: [],
          errors: [`Task not found: ${taskId}`],
          total_processed: 0
        }
      }

      // If task has no milestone, nothing to update
      if (!task.milestone_id) {
        return {
          success: true,
          updated_milestones: [],
          errors: [],
          total_processed: 0
        }
      }

      // Update the milestone
      return await this.updateMilestoneProgress(task.milestone_id)

    } catch (error) {
      return {
        success: false,
        updated_milestones: [],
        errors: [`Error processing task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        total_processed: 0
      }
    }
  }

  /**
   * Update all milestones for a specific project
   */
  static async updateMilestonesForProject(projectId: string): Promise<ProgressUpdateResult> {
    try {
      const supabase = await createClient()

      // Get all active milestones for the project
      const { data: milestones, error } = await supabase
        .from('project_milestones')
        .select('id')
        .eq('project_id', projectId)
        .in('status', ['in_progress', 'not_started'])

      if (error) {
        return {
          success: false,
          updated_milestones: [],
          errors: [`Failed to find milestones for project ${projectId}: ${error.message}`],
          total_processed: 0
        }
      }

      if (!milestones || milestones.length === 0) {
        return {
          success: true,
          updated_milestones: [],
          errors: [],
          total_processed: 0
        }
      }

      // Update all milestones
      const results = await Promise.allSettled(
        milestones.map(milestone => this.updateMilestoneProgress(milestone.id))
      )

      const allUpdatedMilestones: MilestoneProgressUpdate[] = []
      const allErrors: string[] = []
      let totalProcessed = 0

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allUpdatedMilestones.push(...result.value.updated_milestones)
          allErrors.push(...result.value.errors)
          totalProcessed += result.value.total_processed
        } else {
          allErrors.push(result.reason)
        }
      }

      return {
        success: allErrors.length === 0,
        updated_milestones: allUpdatedMilestones,
        errors: allErrors,
        total_processed: totalProcessed
      }

    } catch (error) {
      return {
        success: false,
        updated_milestones: [],
        errors: [`Error processing project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        total_processed: 0
      }
    }
  }

  /**
   * Get milestones that need progress updates
   */
  static async getMilestonesNeedingUpdate(limit: number = 50) {
    try {
      const supabase = await createClient()

      const { data: milestones, error } = await supabase
        .from('project_milestones')
        .select(`
          id,
          name,
          project_id,
          progress_percentage,
          status,
          updated_at,
          projects(name)
        `)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: true })
        .limit(limit)

      if (error) {
        throw error
      }

      return milestones || []

    } catch (error) {
      logger.error('Error getting milestones needing update:', error)
      return []
    }
  }
}
