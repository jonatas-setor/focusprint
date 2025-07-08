import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * POST /api/webhooks/task-updated - Webhook triggered by task updates
 * 
 * This webhook is designed to be called by Supabase database triggers
 * when tasks are updated, specifically when their column_id changes
 * (indicating movement between Kanban columns).
 * 
 * This will trigger milestone progress recalculation for affected milestones.
 * 
 * Security: This endpoint should be protected by a webhook secret
 * in production to prevent unauthorized access.
 * 
 * Headers:
 * - Authorization: Bearer <WEBHOOK_SECRET>
 * - Content-Type: application/json
 * 
 * Body:
 * - type: 'INSERT' | 'UPDATE' | 'DELETE'
 * - table: 'tasks'
 * - record: Task object
 * - old_record: Previous task object (for UPDATE/DELETE)
 * 
 * Returns:
 * - 200: Webhook processed successfully
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret for security
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      
      if (!providedSecret || providedSecret !== webhookSecret) {
        logger.warn('Unauthorized webhook attempt for task-updated');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { type, table, record, old_record } = body;

    // Validate webhook payload
    if (table !== 'tasks') {
      logger.warn('Invalid webhook table:', table);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    logger.info('Task webhook received', { 
      type, 
      task_id: record?.id, 
      old_column: old_record?.column_id,
      new_column: record?.column_id 
    });

    // Check if this is a column change (task moved between Kanban columns)
    const isColumnChange = type === 'UPDATE' && 
                          old_record?.column_id !== record?.column_id;

    // Check if task has milestone_id
    const hasMilestone = record?.milestone_id;

    // Only trigger milestone update if:
    // 1. Task moved between columns (progress might have changed)
    // 2. Task is linked to a milestone
    // 3. Task was created/deleted and has milestone
    if ((isColumnChange || type === 'INSERT' || type === 'DELETE') && hasMilestone) {
      
      // Call milestone progress update job asynchronously
      try {
        const milestoneUpdateUrl = new URL('/api/cron/milestone-progress', request.url);
        
        const updateResponse = await fetch(milestoneUpdateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhookSecret || 'internal'}`
          },
          body: JSON.stringify({
            task_id: record.id,
            milestone_id: record.milestone_id
          })
        });

        if (!updateResponse.ok) {
          logger.error('Failed to trigger milestone progress update', {
            status: updateResponse.status,
            task_id: record.id,
            milestone_id: record.milestone_id
          });
        } else {
          const updateResult = await updateResponse.json();
          logger.info('Milestone progress update triggered successfully', {
            task_id: record.id,
            milestone_id: record.milestone_id,
            updated_count: updateResult.updated_count
          });
        }

      } catch (error) {
        logger.error('Error triggering milestone progress update:', error);
        // Don't fail the webhook if milestone update fails
      }
    }

    // Additional processing for other task changes
    if (type === 'UPDATE') {
      // Log significant task changes for debugging
      const significantChanges = [];
      
      if (old_record?.title !== record?.title) {
        significantChanges.push('title');
      }
      if (old_record?.assigned_to !== record?.assigned_to) {
        significantChanges.push('assigned_to');
      }
      if (old_record?.priority !== record?.priority) {
        significantChanges.push('priority');
      }
      if (old_record?.due_date !== record?.due_date) {
        significantChanges.push('due_date');
      }

      if (significantChanges.length > 0) {
        logger.info('Task updated with significant changes', {
          task_id: record.id,
          changes: significantChanges,
          project_id: record.project_id
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      processed: true,
      type,
      task_id: record?.id,
      milestone_update_triggered: hasMilestone && (isColumnChange || type === 'INSERT' || type === 'DELETE'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Webhook error in task-updated:', error);
    
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
 * GET /api/webhooks/task-updated - Get webhook status and configuration
 */
export async function GET() {
  try {
    return NextResponse.json({
      webhook_info: {
        name: 'task-updated',
        description: 'Processes task updates and triggers milestone progress recalculation',
        supported_events: ['INSERT', 'UPDATE', 'DELETE'],
        table: 'tasks',
        triggers_milestone_update: true
      },
      configuration: {
        requires_webhook_secret: !!process.env.SUPABASE_WEBHOOK_SECRET || !!process.env.CRON_SECRET,
        milestone_update_conditions: [
          'Task moved between columns (column_id changed)',
          'Task created/deleted with milestone_id',
          'Task has milestone_id assigned'
        ]
      },
      status: 'active',
      last_check: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting task webhook status:', error);
    
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
