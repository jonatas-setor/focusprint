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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verify user has access to the project
    const { data: project, error: accessError } = await supabase
      .from('client_data.projects')
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
      .from('client_data.client_profiles')
      .select('client_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || project.teams.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query for milestones
    let query = supabase
      .from('project_milestones')
      .select('id, name, description, due_date, status, progress_percentage, priority, color, position, created_at')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    // Apply search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Apply limit
    query = query.limit(limit)

    const { data: milestones, error: milestonesError } = await query

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
    }

    // For search requests, return simplified data for auto-complete
    if (search) {
      const simplifiedMilestones = milestones.map(milestone => ({
        id: milestone.id,
        name: milestone.name,
        progress_percentage: milestone.progress_percentage || 0,
        status: milestone.status || 'not_started'
      }))
      return NextResponse.json({ milestones: simplifiedMilestones })
    }

    return NextResponse.json({ milestones })

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
      .from('client_data.projects')
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
      .from('client_data.client_profiles')
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
      .from('client_data.project_milestones')
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
