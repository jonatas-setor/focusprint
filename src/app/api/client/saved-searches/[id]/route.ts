import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for updating saved search
const UpdateSavedSearchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  query_config: z.object({
    query: z.string().optional(),
    type: z.enum(['all', 'projects', 'tasks', 'messages']).optional(),
    filters: z.object({
      status: z.array(z.string()).optional(),
      priority: z.array(z.string()).optional(),
      date_range: z.object({
        from: z.string().optional(),
        to: z.string().optional()
      }).optional(),
      project_ids: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  search_type: z.enum(['general', 'projects', 'tasks', 'messages']).optional(),
  is_favorite: z.boolean().optional()
})

// GET /api/client/saved-searches/[id] - Get specific saved search
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

    const { id } = await params

    // Get the saved search
    const { data: savedSearch, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !savedSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // Update last_used_at timestamp
    await supabase
      .from('saved_searches')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    return NextResponse.json({ saved_search: savedSearch })

  } catch (error) {
    console.error('Error in GET /api/client/saved-searches/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/client/saved-searches/[id] - Update saved search
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

    const { id } = await params
    const body = await request.json()
    const validatedData = UpdateSavedSearchSchema.parse(body)

    console.log('📝 Updating saved search:', { id, updates: Object.keys(validatedData) })

    // Check if the saved search exists and belongs to the user
    const { data: existingSearch, error: fetchError } = await supabase
      .from('saved_searches')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // If updating name, check for conflicts
    if (validatedData.name && validatedData.name !== existingSearch.name) {
      const { data: nameConflict } = await supabase
        .from('saved_searches')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', validatedData.name)
        .neq('id', id)
        .single()

      if (nameConflict) {
        return NextResponse.json({ 
          error: 'A saved search with this name already exists' 
        }, { status: 409 })
      }
    }

    // Update the saved search
    const { data: updatedSearch, error } = await supabase
      .from('saved_searches')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved search:', error)
      return NextResponse.json({ error: 'Failed to update saved search' }, { status: 500 })
    }

    return NextResponse.json({ saved_search: updatedSearch })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PATCH /api/client/saved-searches/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/client/saved-searches/[id] - Delete saved search
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

    const { id } = await params

    console.log('🗑️ Deleting saved search:', { id })

    // Delete the saved search
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting saved search:', error)
      return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Saved search deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/client/saved-searches/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
