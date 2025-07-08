import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/cron/milestone-progress/route'
import { MilestoneProgressService } from '@/lib/milestones/progress-service'

// Mock dependencies
jest.mock('@/lib/milestones/progress-service')
jest.mock('@/lib/logger')

const mockMilestoneProgressService = MilestoneProgressService as jest.Mocked<typeof MilestoneProgressService>

describe('/api/cron/milestone-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.CRON_SECRET
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/cron/milestone-progress', () => {
    it('should update specific milestone successfully', async () => {
      const mockResult = {
        success: true,
        updated_milestones: [{
          milestone_id: 'milestone-1',
          old_progress: 25,
          new_progress: 75,
          task_count: 4,
          completed_tasks: 3,
          updated_at: '2024-01-01T00:00:00Z'
        }],
        errors: [],
        total_processed: 1
      }

      mockMilestoneProgressService.updateMilestoneProgress.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        body: JSON.stringify({ milestone_id: 'milestone-1' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated_count).toBe(1)
      expect(data.updated_milestones).toHaveLength(1)
      expect(data.updated_milestones[0].milestone_id).toBe('milestone-1')
      expect(mockMilestoneProgressService.updateMilestoneProgress).toHaveBeenCalledWith('milestone-1')
    })

    it('should update milestones for specific task', async () => {
      const mockResult = {
        success: true,
        updated_milestones: [{
          milestone_id: 'milestone-1',
          old_progress: 50,
          new_progress: 75,
          task_count: 4,
          completed_tasks: 3,
          updated_at: '2024-01-01T00:00:00Z'
        }],
        errors: [],
        total_processed: 1
      }

      mockMilestoneProgressService.updateMilestonesForTask.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        body: JSON.stringify({ task_id: 'task-1' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated_count).toBe(1)
      expect(mockMilestoneProgressService.updateMilestonesForTask).toHaveBeenCalledWith('task-1')
    })

    it('should update milestones for specific project', async () => {
      const mockResult = {
        success: true,
        updated_milestones: [
          {
            milestone_id: 'milestone-1',
            old_progress: 25,
            new_progress: 50,
            task_count: 4,
            completed_tasks: 2,
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            milestone_id: 'milestone-2',
            old_progress: 0,
            new_progress: 25,
            task_count: 4,
            completed_tasks: 1,
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        errors: [],
        total_processed: 2
      }

      mockMilestoneProgressService.updateMilestonesForProject.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        body: JSON.stringify({ project_id: 'project-1' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated_count).toBe(2)
      expect(mockMilestoneProgressService.updateMilestonesForProject).toHaveBeenCalledWith('project-1')
    })

    it('should update all milestones when no specific target provided', async () => {
      const mockMilestones = [
        { id: 'milestone-1', name: 'Milestone 1' },
        { id: 'milestone-2', name: 'Milestone 2' }
      ]

      const mockResults = [
        {
          success: true,
          updated_milestones: [{
            milestone_id: 'milestone-1',
            old_progress: 0,
            new_progress: 50,
            task_count: 2,
            completed_tasks: 1,
            updated_at: '2024-01-01T00:00:00Z'
          }],
          errors: [],
          total_processed: 1
        },
        {
          success: true,
          updated_milestones: [],
          errors: [],
          total_processed: 1
        }
      ]

      mockMilestoneProgressService.getMilestonesNeedingUpdate.mockResolvedValue(mockMilestones)
      mockMilestoneProgressService.updateMilestoneProgress
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated_count).toBe(1)
      expect(data.total_processed).toBe(2)
      expect(mockMilestoneProgressService.getMilestonesNeedingUpdate).toHaveBeenCalledWith(50)
    })

    it('should handle authentication with CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'test-secret'

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer wrong-secret'
        },
        body: JSON.stringify({ milestone_id: 'milestone-1' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should accept valid CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'test-secret'

      const mockResult = {
        success: true,
        updated_milestones: [],
        errors: [],
        total_processed: 0
      }

      mockMilestoneProgressService.updateMilestoneProgress.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret'
        },
        body: JSON.stringify({ milestone_id: 'milestone-1' })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMilestoneProgressService.updateMilestoneProgress).toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      mockMilestoneProgressService.updateMilestoneProgress.mockResolvedValue({
        success: false,
        updated_milestones: [],
        errors: ['Database connection failed'],
        total_processed: 0
      })

      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        body: JSON.stringify({ milestone_id: 'milestone-1' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error_count).toBe(1)
      expect(data.errors).toContain('Database connection failed')
    })

    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/milestone-progress', {
        method: 'POST',
        body: 'invalid-json'
      })

      // Should not throw error, should use empty object as fallback
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockMilestoneProgressService.getMilestonesNeedingUpdate).toHaveBeenCalled()
    })
  })

  describe('GET /api/cron/milestone-progress', () => {
    it('should return milestone progress status', async () => {
      const mockMilestones = [
        {
          id: 'milestone-1',
          name: 'Test Milestone 1',
          project_id: 'project-1',
          progress_percentage: 50,
          status: 'in_progress',
          updated_at: '2024-01-01T00:00:00Z',
          projects: { name: 'Test Project' }
        },
        {
          id: 'milestone-2',
          name: 'Test Milestone 2',
          project_id: 'project-1',
          progress_percentage: 25,
          status: 'in_progress',
          updated_at: '2024-01-01T00:00:00Z',
          projects: { name: 'Test Project' }
        }
      ]

      mockMilestoneProgressService.getMilestonesNeedingUpdate.mockResolvedValue(mockMilestones)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cron_job_info.name).toBe('milestone-progress')
      expect(data.cron_job_info.recommended_schedule).toBe('*/15 * * * *')
      expect(data.milestones_in_progress.count).toBe(2)
      expect(data.milestones_in_progress.milestones).toHaveLength(2)
      expect(data.milestones_in_progress.milestones[0].name).toBe('Test Milestone 1')
      expect(data.next_actions.would_update).toBe(2)
    })

    it('should handle empty milestone list', async () => {
      mockMilestoneProgressService.getMilestonesNeedingUpdate.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.milestones_in_progress.count).toBe(0)
      expect(data.milestones_in_progress.milestones).toHaveLength(0)
      expect(data.next_actions.would_update).toBe(0)
    })

    it('should handle service errors', async () => {
      mockMilestoneProgressService.getMilestonesNeedingUpdate.mockRejectedValue(
        new Error('Database connection failed')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.details).toBe('Database connection failed')
    })
  })
})
