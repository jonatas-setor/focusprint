import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const CreateSavedSearchSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  query_config: z.object({
    query: z.string().optional().default(''),
    type: z.enum(['all', 'projects', 'tasks', 'messages']).optional().default('all'),
    filters: z.object({
      status: z.array(z.string()).optional(),
      priority: z.array(z.string()).optional(),
      date_range: z.object({
        from: z.string().optional(),
        to: z.string().optional()
      }).optional(),
      project_ids: z.array(z.string()).optional()
    }).optional()
  }),
  search_type: z.enum(['general', 'projects', 'tasks', 'messages']).default('general'),
  is_favorite: z.boolean().default(false)
})

const UpdateSavedSearchSchema = CreateSavedSearchSchema.partial()

// GET /api/client/saved-searches - List user's saved searches
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchType = searchParams.get('type')
    const onlyFavorites = searchParams.get('favorites') === 'true'

    // Build query
    let query = supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)

    if (searchType) {
      query = query.eq('search_type', searchType)
    }

    if (onlyFavorites) {
      query = query.eq('is_favorite', true)
    }

    // Order by favorites first, then by last used, then by name
    query = query.order('is_favorite', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true })

    const { data: savedSearches, error } = await query

    if (error) {
      console.error('Error fetching saved searches:', error)
      return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 })
    }

    return NextResponse.json({ saved_searches: savedSearches || [] })

  } catch (error) {
    console.error('Error in GET /api/client/saved-searches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/client/saved-searches - Create new saved search
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateSavedSearchSchema.parse(body)

    console.log('💾 Creating saved search:', {
      name: validatedData.name,
      search_type: validatedData.search_type,
      is_favorite: validatedData.is_favorite
    })

    // Check if a saved search with this name already exists for the user
    const { data: existingSearch } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', validatedData.name)
      .single()

    if (existingSearch) {
      return NextResponse.json({ 
        error: 'A saved search with this name already exists' 
      }, { status: 409 })
    }

    // Create the saved search
    const { data: newSavedSearch, error } = await supabase
      .from('saved_searches')
      .insert([{
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
        query_config: validatedData.query_config,
        search_type: validatedData.search_type,
        is_favorite: validatedData.is_favorite
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating saved search:', error)
      return NextResponse.json({ error: 'Failed to create saved search' }, { status: 500 })
    }

    return NextResponse.json({ saved_search: newSavedSearch }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/client/saved-searches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
