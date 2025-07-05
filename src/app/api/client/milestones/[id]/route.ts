import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
})

// GET /api/client/milestones/[id] - Get milestone details
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

    const { id: milestoneId } = await params

    // Get milestone with project and team info for access control
    const { data: milestone, error } = await supabase
      .from('project_milestones')
      .select(`
        *,
        projects!inner(
          id,
          name,
          teams!inner(client_id)
        ),
        tasks:tasks(
          id,
          title,
          column_id,
          columns(name)
        )
      `)
      .eq('id', milestoneId)
      .single()

    if (error || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || milestone.projects.teams.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate progress if needed
    const { data: progressData } = await supabase
      .rpc('calculate_milestone_progress', { milestone_uuid: milestoneId })

    const milestoneWithProgress = {
      ...milestone,
      progress_data: progressData?.[0] || null
    }

    return NextResponse.json({ milestone: milestoneWithProgress })

  } catch (error) {
    console.error('Error in GET /api/client/milestones/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/client/milestones/[id] - Update milestone
export async function PATCH(
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

    const { id: milestoneId } = await params
    const body = await request.json()

    // Validate request body
    const validatedData = UpdateMilestoneSchema.parse(body)

    // Verify user has access to the milestone
    const { data: milestone, error: accessError } = await supabase
      .from('project_milestones')
      .select(`
        id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', milestoneId)
      .single()

    if (accessError || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || milestone.projects.teams.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update milestone using RPC function
    const { data: success, error } = await supabase
      .rpc('update_milestone', {
        p_milestone_id: milestoneId,
        p_name: validatedData.name || null,
        p_description: validatedData.description || null,
        p_due_date: validatedData.due_date || null,
        p_status: validatedData.status || null,
        p_priority: validatedData.priority || null,
        p_color: validatedData.color || null
      })

    if (error || !success) {
      console.error('Error updating milestone:', error)
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
    }

    // Fetch updated milestone
    const { data: updatedMilestone, error: fetchError } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('id', milestoneId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated milestone:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch updated milestone' }, { status: 500 })
    }

    return NextResponse.json({ milestone: updatedMilestone })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PATCH /api/client/milestones/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/client/milestones/[id] - Delete milestone
export async function DELETE(
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

    const { id: milestoneId } = await params

    // Verify user has access to the milestone
    const { data: milestone, error: accessError } = await supabase
      .from('project_milestones')
      .select(`
        id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', milestoneId)
      .single()

    if (accessError || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || milestone.projects.teams.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete milestone using RPC function
    const { data: success, error } = await supabase
      .rpc('delete_milestone', {
        p_milestone_id: milestoneId
      })

    if (error || !success) {
      console.error('Error deleting milestone:', error)
      return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Milestone deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/client/milestones/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
