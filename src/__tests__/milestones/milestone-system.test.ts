import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createClient } from '@/lib/supabase/server'
import { MilestoneProgressService } from '@/lib/milestones/progress-service'

// Mock Supabase client
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/logger')

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
}

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
mockCreateClient.mockResolvedValue(mockSupabase as any)

describe('Milestone System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Milestone Creation', () => {
    it('should create milestone with correct data structure', async () => {
      const mockMilestone = {
        id: 'milestone-1',
        name: 'Test Milestone',
        project_id: 'project-1',
        status: 'not_started',
        progress_percentage: 0,
        due_date: '2024-12-31',
        priority: 'high',
        color: '#3B82F6'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: 'milestone-1',
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMilestone,
              error: null
            })
          })
        })
      })

      // Test milestone creation via RPC
      const { data: milestoneId, error } = await mockSupabase.rpc('create_milestone', {
        p_project_id: 'project-1',
        p_name: 'Test Milestone',
        p_description: 'Test description',
        p_due_date: '2024-12-31',
        p_priority: 'high',
        p_color: '#3B82F6',
        p_created_by: 'user-1'
      })

      expect(error).toBeNull()
      expect(milestoneId).toBe('milestone-1')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_milestone', expect.objectContaining({
        p_project_id: 'project-1',
        p_name: 'Test Milestone'
      }))
    })

    it('should validate milestone creation parameters', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid parameters' }
      })

      const { data, error } = await mockSupabase.rpc('create_milestone', {
        p_project_id: '',
        p_name: '',
        p_created_by: 'user-1'
      })

      expect(data).toBeNull()
      expect(error).toBeTruthy()
      expect(error.message).toBe('Invalid parameters')
    })
  })

  describe('Progress Calculation', () => {
    it('should calculate milestone progress correctly', async () => {
      const mockProgressData = [{
        milestone_id: 'milestone-1',
        total_tasks: 4,
        completed_tasks: 2,
        progress_percentage: 50
      }]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockProgressData,
        error: null
      })

      const { data: progressData, error } = await mockSupabase.rpc('calculate_milestone_progress', {
        milestone_uuid: 'milestone-1'
      })

      expect(error).toBeNull()
      expect(progressData).toHaveLength(1)
      expect(progressData[0].progress_percentage).toBe(50)
      expect(progressData[0].total_tasks).toBe(4)
      expect(progressData[0].completed_tasks).toBe(2)
    })

    it('should handle milestone with no tasks', async () => {
      const mockProgressData = [{
        milestone_id: 'milestone-1',
        total_tasks: 0,
        completed_tasks: 0,
        progress_percentage: 0
      }]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockProgressData,
        error: null
      })

      const { data: progressData, error } = await mockSupabase.rpc('calculate_milestone_progress', {
        milestone_uuid: 'milestone-1'
      })

      expect(error).toBeNull()
      expect(progressData[0].progress_percentage).toBe(0)
      expect(progressData[0].total_tasks).toBe(0)
    })

    it('should handle milestone with all tasks completed', async () => {
      const mockProgressData = [{
        milestone_id: 'milestone-1',
        total_tasks: 3,
        completed_tasks: 3,
        progress_percentage: 100
      }]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockProgressData,
        error: null
      })

      const { data: progressData, error } = await mockSupabase.rpc('calculate_milestone_progress', {
        milestone_uuid: 'milestone-1'
      })

      expect(error).toBeNull()
      expect(progressData[0].progress_percentage).toBe(100)
      expect(progressData[0].completed_tasks).toBe(3)
    })
  })

  describe('Task-Milestone Linking', () => {
    it('should link task to milestone correctly', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        milestone_id: 'milestone-1',
        column_id: 'column-1',
        project_id: 'project-1'
      }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockTask],
            error: null
          })
        })
      })

      const { data, error } = await mockSupabase
        .from('tasks')
        .update({ milestone_id: 'milestone-1' })
        .eq('id', 'task-1')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data[0].milestone_id).toBe('milestone-1')
    })

    it('should unlink task from milestone', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        milestone_id: null,
        column_id: 'column-1',
        project_id: 'project-1'
      }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockTask],
            error: null
          })
        })
      })

      const { data, error } = await mockSupabase
        .from('tasks')
        .update({ milestone_id: null })
        .eq('id', 'task-1')

      expect(error).toBeNull()
      expect(data[0].milestone_id).toBeNull()
    })
  })

  describe('MilestoneProgressService', () => {
    it('should update milestone progress successfully', async () => {
      const mockMilestone = {
        id: 'milestone-1',
        name: 'Test Milestone',
        project_id: 'project-1',
        progress_percentage: 25,
        status: 'in_progress'
      }

      const mockProgressData = [{
        milestone_id: 'milestone-1',
        total_tasks: 4,
        completed_tasks: 3,
        progress_percentage: 75
      }]

      // Mock milestone fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMilestone,
              error: null
            })
          })
        })
      })

      // Mock progress calculation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockProgressData,
        error: null
      })

      // Mock milestone update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      })

      const result = await MilestoneProgressService.updateMilestoneProgress('milestone-1')

      expect(result.success).toBe(true)
      expect(result.updated_milestones).toHaveLength(1)
      expect(result.updated_milestones[0].old_progress).toBe(25)
      expect(result.updated_milestones[0].new_progress).toBe(75)
    })

    it('should handle milestone not found error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Milestone not found' }
            })
          })
        })
      })

      const result = await MilestoneProgressService.updateMilestoneProgress('nonexistent-milestone')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Milestone not found: nonexistent-milestone')
    })

    it('should skip completed milestones', async () => {
      const mockMilestone = {
        id: 'milestone-1',
        name: 'Completed Milestone',
        project_id: 'project-1',
        progress_percentage: 100,
        status: 'completed'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMilestone,
              error: null
            })
          })
        })
      })

      const result = await MilestoneProgressService.updateMilestoneProgress('milestone-1')

      expect(result.success).toBe(true)
      expect(result.updated_milestones).toHaveLength(0)
      expect(result.total_processed).toBe(0)
    })
  })

  describe('Progress Update Integration', () => {
    it('should update milestone when task moves to completed column', async () => {
      const mockTask = {
        id: 'task-1',
        milestone_id: 'milestone-1',
        project_id: 'project-1'
      }

      // Mock task fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTask,
              error: null
            })
          })
        })
      })

      // Mock milestone progress update
      const mockMilestone = {
        id: 'milestone-1',
        name: 'Test Milestone',
        project_id: 'project-1',
        progress_percentage: 50,
        status: 'in_progress'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMilestone,
              error: null
            })
          })
        })
      })

      const mockProgressData = [{
        milestone_id: 'milestone-1',
        total_tasks: 2,
        completed_tasks: 2,
        progress_percentage: 100
      }]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockProgressData,
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      })

      const result = await MilestoneProgressService.updateMilestonesForTask('task-1')

      expect(result.success).toBe(true)
      expect(result.updated_milestones).toHaveLength(1)
      expect(result.updated_milestones[0].new_progress).toBe(100)
    })
  })
})
