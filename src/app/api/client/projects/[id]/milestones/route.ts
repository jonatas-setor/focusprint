import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const CreateMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6')
})

// GET /api/client/projects/[id]/milestones - List project milestones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify user has access to the project
    const { data: project, error: accessError } = await supabase
      .from('projects')
      .select(`
        id,
        teams!inner(client_id)
      `)
      .eq('id', projectId)
      .single()

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || project.teams.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get project milestones with task counts
    const { data: milestones, error } = await supabase
      .from('project_milestones')
      .select(`
        *,
        tasks:tasks(count)
      `)
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
    }

    // Transform the data to include task counts
    const milestonesWithCounts = milestones.map(milestone => ({
      ...milestone,
      task_count: milestone.tasks?.[0]?.count || 0
    }))

    return NextResponse.json({ milestones: milestonesWithCounts })

  } catch (error) {
    console.error('Error in GET /api/client/projects/[id]/milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/client/projects/[id]/milestones - Create new milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()

    // Validate request body
    const validatedData = CreateMilestoneSchema.parse(body)

    // Verify user has access to the project
    const { data: project, error: accessError } = await supabase
      .from('projects')
      .select(`
        id,
        teams!inner(client_id)
      `)
      .eq('id', projectId)
      .single()

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || project.teams.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create milestone using RPC function
    const { data: milestoneId, error } = await supabase
      .rpc('create_milestone', {
        p_project_id: projectId,
        p_name: validatedData.name,
        p_description: validatedData.description || null,
        p_due_date: validatedData.due_date || null,
        p_priority: validatedData.priority,
        p_color: validatedData.color,
        p_created_by: user.id
      })

    if (error) {
      console.error('Error creating milestone:', error)
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
    }

    // Fetch the created milestone
    const { data: newMilestone, error: fetchError } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('id', milestoneId)
      .single()

    if (fetchError) {
      console.error('Error fetching created milestone:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch created milestone' }, { status: 500 })
    }

    return NextResponse.json({ milestone: newMilestone }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/client/projects/[id]/milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
