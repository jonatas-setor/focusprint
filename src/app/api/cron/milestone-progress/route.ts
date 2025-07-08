import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { MilestoneProgressService } from '@/lib/milestones/progress-service'

/**
 * POST /api/cron/milestone-progress - Background job to update milestone progress
 * 
 * This endpoint is designed to be called by a cron service or triggered by task changes
 * to automatically recalculate milestone progress based on linked task completion.
 * 
 * Security: This endpoint should be protected by a cron secret or API key
 * in production to prevent unauthorized access.
 * 
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (optional, for security)
 * 
 * Body (optional):
 * - project_id: string - Update milestones for specific project only
 * - milestone_id: string - Update specific milestone only
 * - task_id: string - Update milestones affected by specific task
 * 
 * Returns:
 * - 200: Progress update completed successfully
 * - 401: Unauthorized (if cron secret is required and invalid)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      
      if (!providedSecret || providedSecret !== cronSecret) {
        logger.warn('Unauthorized cron job attempt to update milestone progress');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    logger.info('Starting milestone progress update job');

    const body = await request.json().catch(() => ({}));
    const { project_id, milestone_id, task_id } = body;

    let result;

    if (milestone_id) {
      // Update specific milestone
      result = await MilestoneProgressService.updateMilestoneProgress(milestone_id);
    } else if (task_id) {
      // Update milestones affected by specific task
      result = await MilestoneProgressService.updateMilestonesForTask(task_id);
    } else if (project_id) {
      // Update all milestones for specific project
      result = await MilestoneProgressService.updateMilestonesForProject(project_id);
    } else {
      // Update all milestones that need recalculation
      const milestones = await MilestoneProgressService.getMilestonesNeedingUpdate(50);
      const results = await Promise.allSettled(
        milestones.map(milestone => MilestoneProgressService.updateMilestoneProgress(milestone.id))
      );

      const allUpdatedMilestones = [];
      const allErrors = [];
      let totalProcessed = 0;

      for (const res of results) {
        if (res.status === 'fulfilled') {
          allUpdatedMilestones.push(...res.value.updated_milestones);
          allErrors.push(...res.value.errors);
          totalProcessed += res.value.total_processed;
        } else {
          allErrors.push(res.reason);
        }
      }

      result = {
        success: allErrors.length === 0,
        updated_milestones: allUpdatedMilestones,
        errors: allErrors,
        total_processed: totalProcessed
      };
    }

    const summary = {
      success: result.success,
      updated_count: result.updated_milestones.length,
      error_count: result.errors.length,
      total_processed: result.total_processed,
      updated_milestones: result.updated_milestones.map(m => ({
        milestone_id: m.milestone_id,
        old_progress: m.old_progress,
        new_progress: m.new_progress,
        task_count: m.task_count,
        completed_tasks: m.completed_tasks
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString()
    };

    logger.info('Milestone progress update completed', summary);

    return NextResponse.json(summary);

  } catch (error) {
    logger.error('Cron job error in milestone-progress:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/milestone-progress - Get milestone progress update status
 */
export async function GET() {
  try {
    // Get milestones that might need progress updates
    const milestonesNeedingUpdate = await MilestoneProgressService.getMilestonesNeedingUpdate(10);

    return NextResponse.json({
      cron_job_info: {
        name: 'milestone-progress',
        description: 'Automatically update milestone progress based on task completion',
        recommended_schedule: '*/15 * * * *', // Every 15 minutes
        last_check: new Date().toISOString()
      },
      milestones_in_progress: {
        count: milestonesNeedingUpdate.length,
        milestones: milestonesNeedingUpdate.map(milestone => ({
          id: milestone.id,
          name: milestone.name,
          project_name: milestone.projects?.name,
          current_progress: milestone.progress_percentage,
          status: milestone.status,
          last_updated: milestone.updated_at
        }))
      },
      next_actions: {
        would_update: milestonesNeedingUpdate.length
      }
    });

  } catch (error) {
    logger.error('Error getting milestone progress status:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
