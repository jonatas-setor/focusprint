import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/webhooks/task-updated/route'

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/webhooks/task-updated', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.SUPABASE_WEBHOOK_SECRET
    delete process.env.CRON_SECRET
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/webhooks/task-updated', () => {
    it('should process task column change and trigger milestone update', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          updated_count: 1,
          updated_milestones: [{
            milestone_id: 'milestone-1',
            old_progress: 50,
            new_progress: 75
          }]
        })
      } as Response)

      const webhookPayload = {
        type: 'UPDATE',
        table: 'tasks',
        record: {
          id: 'task-1',
          title: 'Test Task',
          column_id: 'column-completed',
          milestone_id: 'milestone-1',
          project_id: 'project-1'
        },
        old_record: {
          id: 'task-1',
          title: 'Test Task',
          column_id: 'column-todo',
          milestone_id: 'milestone-1',
          project_id: 'project-1'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(true)
      expect(data.milestone_update_triggered).toBe(true)
      expect(data.task_id).toBe('task-1')

      // Verify milestone progress update was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cron/milestone-progress'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            task_id: 'task-1',
            milestone_id: 'milestone-1'
          })
        })
      )
    })

    it('should process task creation with milestone', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, updated_count: 1 })
      } as Response)

      const webhookPayload = {
        type: 'INSERT',
        table: 'tasks',
        record: {
          id: 'task-1',
          title: 'New Task',
          column_id: 'column-todo',
          milestone_id: 'milestone-1',
          project_id: 'project-1'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.milestone_update_triggered).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should process task deletion with milestone', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, updated_count: 1 })
      } as Response)

      const webhookPayload = {
        type: 'DELETE',
        table: 'tasks',
        record: {
          id: 'task-1',
          title: 'Deleted Task',
          column_id: 'column-todo',
          milestone_id: 'milestone-1',
          project_id: 'project-1'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.milestone_update_triggered).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should skip milestone update for tasks without milestone', async () => {
      const webhookPayload = {
        type: 'UPDATE',
        table: 'tasks',
        record: {
          id: 'task-1',
          title: 'Test Task',
          column_id: 'column-completed',
          milestone_id: null,
          project_id: 'project-1'
        },
        old_record: {
          id: 'task-1',
          title: 'Test Task',
          column_id: 'column-todo',
          milestone_id: null,
          project_id: 'project-1'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.milestone_update_triggered).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should skip milestone update for non-column changes', async () => {
      const webhookPayload = {
        type: 'UPDATE',
        table: 'tasks',
        record: {
          id: 'task-1',
          title: 'Updated Task Title',
          column_id: 'column-todo',
          milestone_id: 'milestone-1',
          project_id: 'project-1'
        },
        old_record: {
          id: 'task-1',
          title: 'Test Task',
          column_id: 'column-todo',
          milestone_id: 'milestone-1',
          project_id: 'project-1'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.milestone_update_triggered).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle webhook authentication', async () => {
      process.env.SUPABASE_WEBHOOK_SECRET = 'test-secret'

      const webhookPayload = {
        type: 'UPDATE',
        table: 'tasks',
        record: { id: 'task-1', milestone_id: 'milestone-1' }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer wrong-secret'
        },
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should accept valid webhook secret', async () => {
      process.env.SUPABASE_WEBHOOK_SECRET = 'test-secret'

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, updated_count: 1 })
      } as Response)

      const webhookPayload = {
        type: 'INSERT',
        table: 'tasks',
        record: {
          id: 'task-1',
          milestone_id: 'milestone-1',
          column_id: 'column-todo'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret'
        },
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should reject invalid table', async () => {
      const webhookPayload = {
        type: 'UPDATE',
        table: 'projects',
        record: { id: 'project-1' }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid table')
    })

    it('should handle milestone update API failure gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const webhookPayload = {
        type: 'UPDATE',
        table: 'tasks',
        record: {
          id: 'task-1',
          column_id: 'column-completed',
          milestone_id: 'milestone-1'
        },
        old_record: {
          id: 'task-1',
          column_id: 'column-todo',
          milestone_id: 'milestone-1'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/task-updated', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still return success even if milestone update fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.milestone_update_triggered).toBe(true)
    })
  })

  describe('GET /api/webhooks/task-updated', () => {
    it('should return webhook configuration', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.webhook_info.name).toBe('task-updated')
      expect(data.webhook_info.supported_events).toContain('INSERT')
      expect(data.webhook_info.supported_events).toContain('UPDATE')
      expect(data.webhook_info.supported_events).toContain('DELETE')
      expect(data.webhook_info.table).toBe('tasks')
      expect(data.webhook_info.triggers_milestone_update).toBe(true)
      expect(data.status).toBe('active')
    })

    it('should show webhook secret requirement', async () => {
      process.env.SUPABASE_WEBHOOK_SECRET = 'test-secret'

      const response = await GET()
      const data = await response.json()

      expect(data.configuration.requires_webhook_secret).toBe(true)
    })
  })
})
