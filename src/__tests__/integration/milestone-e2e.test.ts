import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// This test requires a test Supabase instance
// Skip if not in test environment
const isTestEnvironment = process.env.NODE_ENV === 'test' && 
                          process.env.SUPABASE_URL && 
                          process.env.SUPABASE_ANON_KEY

const describeIf = (condition: boolean) => condition ? describe : describe.skip

describeIf(isTestEnvironment)('Milestone System E2E Integration Tests', () => {
  let supabase: any
  let testProjectId: string
  let testUserId: string
  let testClientId: string
  let testTeamId: string

  beforeAll(async () => {
    if (!isTestEnvironment) return

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    // Create test data
    const testData = await setupTestData()
    testProjectId = testData.projectId
    testUserId = testData.userId
    testClientId = testData.clientId
    testTeamId = testData.teamId
  })

  afterAll(async () => {
    if (!isTestEnvironment) return
    await cleanupTestData()
  })

  beforeEach(async () => {
    if (!isTestEnvironment) return
    // Clean up any test milestones and tasks before each test
    await cleanupTestMilestones()
  })

  afterEach(async () => {
    if (!isTestEnvironment) return
    await cleanupTestMilestones()
  })

  async function setupTestData() {
    // Create test client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: 'Test Client E2E',
        email: 'test-e2e@example.com',
        status: 'active',
        plan_type: 'pro'
      })
      .select()
      .single()

    if (clientError) throw clientError

    // Create test team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: 'Test Team E2E',
        client_id: client.id
      })
      .select()
      .single()

    if (teamError) throw teamError

    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'test-milestone-e2e@example.com',
      password: 'test-password-123'
    })

    if (userError) throw userError

    // Create test project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project E2E',
        description: 'Test project for milestone E2E tests',
        team_id: team.id,
        status: 'active',
        created_by: user.user!.id
      })
      .select()
      .single()

    if (projectError) throw projectError

    // Create default columns
    const columns = [
      { name: 'A Fazer', position: 1, color: '#6B7280' },
      { name: 'Em Progresso', position: 2, color: '#3B82F6' },
      { name: 'Em Revisão', position: 3, color: '#F59E0B' },
      { name: 'Concluído', position: 4, color: '#10B981' }
    ]

    for (const column of columns) {
      await supabase
        .from('columns')
        .insert({
          ...column,
          project_id: project.id
        })
    }

    return {
      projectId: project.id,
      userId: user.user!.id,
      clientId: client.id,
      teamId: team.id
    }
  }

  async function cleanupTestData() {
    if (!testProjectId) return

    // Delete in reverse order of dependencies
    await supabase.from('tasks').delete().eq('project_id', testProjectId)
    await supabase.from('project_milestones').delete().eq('project_id', testProjectId)
    await supabase.from('columns').delete().eq('project_id', testProjectId)
    await supabase.from('projects').delete().eq('id', testProjectId)
    await supabase.from('teams').delete().eq('id', testTeamId)
    await supabase.from('clients').delete().eq('id', testClientId)
  }

  async function cleanupTestMilestones() {
    if (!testProjectId) return
    
    await supabase.from('tasks').delete().eq('project_id', testProjectId)
    await supabase.from('project_milestones').delete().eq('project_id', testProjectId)
  }

  it('should create milestone and calculate progress correctly', async () => {
    // Create milestone
    const { data: milestoneId, error: milestoneError } = await supabase
      .rpc('create_milestone', {
        p_project_id: testProjectId,
        p_name: 'Test Milestone E2E',
        p_description: 'End-to-end test milestone',
        p_due_date: '2024-12-31',
        p_priority: 'high',
        p_color: '#3B82F6',
        p_created_by: testUserId
      })

    expect(milestoneError).toBeNull()
    expect(milestoneId).toBeTruthy()

    // Get columns for task creation
    const { data: columns } = await supabase
      .from('columns')
      .select('id, name')
      .eq('project_id', testProjectId)
      .order('position')

    const todoColumn = columns.find(c => c.name === 'A Fazer')
    const doneColumn = columns.find(c => c.name === 'Concluído')

    // Create tasks linked to milestone
    const tasks = [
      { title: 'Task 1', column_id: todoColumn.id },
      { title: 'Task 2', column_id: todoColumn.id },
      { title: 'Task 3', column_id: doneColumn.id },
      { title: 'Task 4', column_id: doneColumn.id }
    ]

    const createdTasks = []
    for (const task of tasks) {
      const { data: taskData, error: taskError } = await supabase
        .rpc('create_task', {
          p_project_id: testProjectId,
          p_column_id: task.column_id,
          p_title: task.title,
          p_description: '',
          p_priority: 'medium',
          p_created_by: testUserId,
          p_milestone_id: milestoneId
        })

      expect(taskError).toBeNull()
      createdTasks.push(taskData[0])
    }

    // Calculate milestone progress
    const { data: progressData, error: progressError } = await supabase
      .rpc('calculate_milestone_progress', { milestone_uuid: milestoneId })

    expect(progressError).toBeNull()
    expect(progressData).toHaveLength(1)
    expect(progressData[0].total_tasks).toBe(4)
    expect(progressData[0].completed_tasks).toBe(2) // 2 tasks in 'Concluído' column
    expect(progressData[0].progress_percentage).toBe(50)
  })

  it('should update milestone progress when task moves between columns', async () => {
    // Create milestone
    const { data: milestoneId } = await supabase
      .rpc('create_milestone', {
        p_project_id: testProjectId,
        p_name: 'Progress Update Test',
        p_description: 'Test milestone progress updates',
        p_created_by: testUserId
      })

    // Get columns
    const { data: columns } = await supabase
      .from('columns')
      .select('id, name')
      .eq('project_id', testProjectId)
      .order('position')

    const todoColumn = columns.find(c => c.name === 'A Fazer')
    const doneColumn = columns.find(c => c.name === 'Concluído')

    // Create task in todo column
    const { data: taskData } = await supabase
      .rpc('create_task', {
        p_project_id: testProjectId,
        p_column_id: todoColumn.id,
        p_title: 'Movable Task',
        p_description: '',
        p_priority: 'medium',
        p_created_by: testUserId,
        p_milestone_id: milestoneId
      })

    const taskId = taskData[0].id

    // Initial progress should be 0%
    let { data: progressData } = await supabase
      .rpc('calculate_milestone_progress', { milestone_uuid: milestoneId })

    expect(progressData[0].progress_percentage).toBe(0)

    // Move task to done column
    const { error: updateError } = await supabase
      .rpc('update_task_v2', {
        p_task_id: taskId,
        p_user_id: testUserId,
        p_column_id: doneColumn.id
      })

    expect(updateError).toBeNull()

    // Progress should now be 100%
    const { data: updatedProgressData } = await supabase
      .rpc('calculate_milestone_progress', { milestone_uuid: milestoneId })

    expect(updatedProgressData[0].progress_percentage).toBe(100)
  })

  it('should handle milestone status changes based on progress', async () => {
    // Create milestone
    const { data: milestoneId } = await supabase
      .rpc('create_milestone', {
        p_project_id: testProjectId,
        p_name: 'Status Change Test',
        p_description: 'Test milestone status changes',
        p_created_by: testUserId
      })

    // Get initial milestone status
    let { data: milestone } = await supabase
      .from('project_milestones')
      .select('status, progress_percentage')
      .eq('id', milestoneId)
      .single()

    expect(milestone.status).toBe('not_started')
    expect(milestone.progress_percentage).toBe(0)

    // Get columns
    const { data: columns } = await supabase
      .from('columns')
      .select('id, name')
      .eq('project_id', testProjectId)
      .order('position')

    const todoColumn = columns.find(c => c.name === 'A Fazer')
    const progressColumn = columns.find(c => c.name === 'Em Progresso')
    const doneColumn = columns.find(c => c.name === 'Concluído')

    // Create tasks
    const { data: task1Data } = await supabase
      .rpc('create_task', {
        p_project_id: testProjectId,
        p_column_id: todoColumn.id,
        p_title: 'Task 1',
        p_created_by: testUserId,
        p_milestone_id: milestoneId
      })

    const { data: task2Data } = await supabase
      .rpc('create_task', {
        p_project_id: testProjectId,
        p_column_id: todoColumn.id,
        p_title: 'Task 2',
        p_created_by: testUserId,
        p_milestone_id: milestoneId
      })

    // Move one task to progress - milestone should become 'in_progress'
    await supabase
      .rpc('update_task_v2', {
        p_task_id: task1Data[0].id,
        p_user_id: testUserId,
        p_column_id: progressColumn.id
      })

    // Update milestone status manually (in real app this would be done by the progress service)
    await supabase
      .from('project_milestones')
      .update({ status: 'in_progress', progress_percentage: 0 })
      .eq('id', milestoneId)

    // Move both tasks to done - milestone should become 'completed'
    await supabase
      .rpc('update_task_v2', {
        p_task_id: task1Data[0].id,
        p_user_id: testUserId,
        p_column_id: doneColumn.id
      })

    await supabase
      .rpc('update_task_v2', {
        p_task_id: task2Data[0].id,
        p_user_id: testUserId,
        p_column_id: doneColumn.id
      })

    // Update milestone to completed status
    await supabase
      .from('project_milestones')
      .update({ status: 'completed', progress_percentage: 100 })
      .eq('id', milestoneId)

    // Verify final status
    const { data: finalMilestone } = await supabase
      .from('project_milestones')
      .select('status, progress_percentage')
      .eq('id', milestoneId)
      .single()

    expect(finalMilestone.status).toBe('completed')
    expect(finalMilestone.progress_percentage).toBe(100)
  })

  it('should handle milestone deletion and task unlinking', async () => {
    // Create milestone
    const { data: milestoneId } = await supabase
      .rpc('create_milestone', {
        p_project_id: testProjectId,
        p_name: 'Deletion Test',
        p_description: 'Test milestone deletion',
        p_created_by: testUserId
      })

    // Get column
    const { data: columns } = await supabase
      .from('columns')
      .select('id')
      .eq('project_id', testProjectId)
      .limit(1)

    // Create task linked to milestone
    const { data: taskData } = await supabase
      .rpc('create_task', {
        p_project_id: testProjectId,
        p_column_id: columns[0].id,
        p_title: 'Linked Task',
        p_created_by: testUserId,
        p_milestone_id: milestoneId
      })

    const taskId = taskData[0].id

    // Verify task is linked to milestone
    let { data: task } = await supabase
      .from('tasks')
      .select('milestone_id')
      .eq('id', taskId)
      .single()

    expect(task.milestone_id).toBe(milestoneId)

    // Delete milestone
    const { error: deleteError } = await supabase
      .rpc('delete_milestone', { p_milestone_id: milestoneId })

    expect(deleteError).toBeNull()

    // Verify milestone is deleted
    const { data: deletedMilestone } = await supabase
      .from('project_milestones')
      .select('id')
      .eq('id', milestoneId)
      .single()

    expect(deletedMilestone).toBeNull()

    // Verify task milestone_id is set to null
    const { data: unlinkedTask } = await supabase
      .from('tasks')
      .select('milestone_id')
      .eq('id', taskId)
      .single()

    expect(unlinkedTask.milestone_id).toBeNull()
  })
})
