import { useCallback, useEffect, useState } from 'react'
import { useRealtime } from '@/contexts/realtime-context'
import { logger } from '@/lib/logger'

interface MilestoneProgress {
  milestone_id: string
  progress_percentage: number
  total_tasks: number
  completed_tasks: number
  updated_at: string
}

interface UseMilestoneProgressOptions {
  projectId?: string
  milestoneId?: string
  autoUpdate?: boolean
  updateInterval?: number
}

interface UseMilestoneProgressReturn {
  progress: Record<string, MilestoneProgress>
  isUpdating: boolean
  lastUpdate: Date | null
  triggerUpdate: (options?: { milestoneId?: string; taskId?: string }) => Promise<void>
  error: string | null
}

/**
 * Hook for managing milestone progress updates
 * Provides real-time progress tracking and manual update triggers
 */
export function useMilestoneProgress(options: UseMilestoneProgressOptions = {}): UseMilestoneProgressReturn {
  const { projectId, milestoneId, autoUpdate = true, updateInterval = 30000 } = options
  
  const [progress, setProgress] = useState<Record<string, MilestoneProgress>>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { subscribeToTasks } = useRealtime()

  /**
   * Trigger milestone progress update
   */
  const triggerUpdate = useCallback(async (updateOptions?: { milestoneId?: string; taskId?: string }) => {
    try {
      setIsUpdating(true)
      setError(null)

      const body: any = {}
      
      if (updateOptions?.milestoneId) {
        body.milestone_id = updateOptions.milestoneId
      } else if (updateOptions?.taskId) {
        body.task_id = updateOptions.taskId
      } else if (milestoneId) {
        body.milestone_id = milestoneId
      } else if (projectId) {
        body.project_id = projectId
      }

      const response = await fetch('/api/cron/milestone-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`Failed to update milestone progress: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.updated_milestones) {
        // Update progress state with new data
        const newProgress = { ...progress }
        
        for (const milestone of result.updated_milestones) {
          newProgress[milestone.milestone_id] = {
            milestone_id: milestone.milestone_id,
            progress_percentage: milestone.new_progress,
            total_tasks: milestone.task_count,
            completed_tasks: milestone.completed_tasks,
            updated_at: new Date().toISOString()
          }
        }
        
        setProgress(newProgress)
        setLastUpdate(new Date())
        
        logger.info('Milestone progress updated', {
          updated_count: result.updated_count,
          milestones: result.updated_milestones.map((m: any) => ({
            id: m.milestone_id,
            progress: `${m.old_progress}% -> ${m.new_progress}%`
          }))
        })
      }

      if (result.errors && result.errors.length > 0) {
        logger.warn('Milestone progress update had errors:', result.errors)
        setError(result.errors.join('; '))
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      logger.error('Error triggering milestone progress update:', err)
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }, [projectId, milestoneId, progress])

  /**
   * Handle task updates from realtime subscription
   */
  const handleTaskUpdate = useCallback((payload: any) => {
    const { eventType, new: newTask, old: oldTask } = payload

    // Check if this task change affects milestone progress
    const isColumnChange = eventType === 'UPDATE' && oldTask?.column_id !== newTask?.column_id
    const hasMilestone = newTask?.milestone_id || oldTask?.milestone_id
    const isRelevantChange = (eventType === 'INSERT' || eventType === 'DELETE' || isColumnChange) && hasMilestone

    if (isRelevantChange) {
      // Debounce updates to avoid too many API calls
      const timeoutId = setTimeout(() => {
        triggerUpdate({ taskId: newTask?.id || oldTask?.id })
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [triggerUpdate])

  // Subscribe to task updates for automatic progress updates
  useEffect(() => {
    if (!autoUpdate || !projectId) return

    const unsubscribe = subscribeToTasks(projectId, handleTaskUpdate)
    return unsubscribe
  }, [projectId, autoUpdate, subscribeToTasks, handleTaskUpdate])

  // Periodic progress updates
  useEffect(() => {
    if (!autoUpdate || updateInterval <= 0) return

    const intervalId = setInterval(() => {
      if (!isUpdating) {
        triggerUpdate()
      }
    }, updateInterval)

    return () => clearInterval(intervalId)
  }, [autoUpdate, updateInterval, isUpdating, triggerUpdate])

  // Initial progress load
  useEffect(() => {
    if (projectId || milestoneId) {
      triggerUpdate()
    }
  }, [projectId, milestoneId]) // Don't include triggerUpdate to avoid infinite loop

  return {
    progress,
    isUpdating,
    lastUpdate,
    triggerUpdate,
    error
  }
}

/**
 * Simplified hook for single milestone progress
 */
export function useSingleMilestoneProgress(milestoneId: string) {
  const { progress, isUpdating, triggerUpdate, error } = useMilestoneProgress({
    milestoneId,
    autoUpdate: true
  })

  return {
    progress: progress[milestoneId] || null,
    isUpdating,
    triggerUpdate: () => triggerUpdate({ milestoneId }),
    error
  }
}

/**
 * Hook for project-wide milestone progress
 */
export function useProjectMilestoneProgress(projectId: string) {
  const { progress, isUpdating, triggerUpdate, error, lastUpdate } = useMilestoneProgress({
    projectId,
    autoUpdate: true,
    updateInterval: 60000 // Update every minute for project-wide
  })

  const milestones = Object.values(progress)
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.progress_percentage === 100).length
  const averageProgress = totalMilestones > 0 
    ? milestones.reduce((sum, m) => sum + m.progress_percentage, 0) / totalMilestones 
    : 0

  return {
    milestones: progress,
    totalMilestones,
    completedMilestones,
    averageProgress: Math.round(averageProgress),
    isUpdating,
    lastUpdate,
    triggerUpdate: () => triggerUpdate({ projectId }),
    error
  }
}
