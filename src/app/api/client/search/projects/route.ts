import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for search parameters
const SearchParamsSchema = z.object({
  q: z.string().optional().default(''),
  type: z.enum(['all', 'projects', 'tasks', 'messages']).optional().default('all'),
  status: z.string().optional(),
  priority: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  project_ids: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0)
})

// GET /api/client/search/projects - Advanced project search
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = SearchParamsSchema.parse({
      q: searchParams.get('q'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      project_ids: searchParams.get('project_ids'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    // Parse arrays from comma-separated strings
    const statusFilter = params.status ? params.status.split(',') : null
    const priorityFilter = params.priority ? params.priority.split(',') : null
    const projectIdsFilter = params.project_ids ? params.project_ids.split(',') : null

    // Convert date strings to Date objects if provided
    const dateFrom = params.date_from ? new Date(params.date_from).toISOString().split('T')[0] : null
    const dateTo = params.date_to ? new Date(params.date_to).toISOString().split('T')[0] : null

    console.log('🔍 Search request:', {
      query: params.q,
      type: params.type,
      statusFilter,
      priorityFilter,
      dateFrom,
      dateTo,
      projectIdsFilter,
      limit: params.limit,
      offset: params.offset
    })

    // Execute advanced search using RPC function
    const { data: searchResults, error } = await supabase
      .rpc('advanced_project_search', {
        search_query: params.q,
        search_type: params.type,
        status_filter: statusFilter,
        priority_filter: priorityFilter,
        date_from: dateFrom,
        date_to: dateTo,
        project_ids: projectIdsFilter,
        limit_results: params.limit,
        offset_results: params.offset
      })

    if (error) {
      console.error('Error executing search:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Group results by type for better organization
    const groupedResults = {
      projects: searchResults?.filter(r => r.result_type === 'project') || [],
      tasks: searchResults?.filter(r => r.result_type === 'task') || [],
      messages: searchResults?.filter(r => r.result_type === 'message') || []
    }

    // Calculate total counts
    const totalResults = searchResults?.length || 0
    const hasMore = totalResults === params.limit

    return NextResponse.json({
      results: searchResults || [],
      grouped_results: groupedResults,
      pagination: {
        total: totalResults,
        limit: params.limit,
        offset: params.offset,
        has_more: hasMore
      },
      search_params: {
        query: params.q,
        type: params.type,
        filters: {
          status: statusFilter,
          priority: priorityFilter,
          date_range: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
          project_ids: projectIdsFilter
        }
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid search parameters', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in GET /api/client/search/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/client/search/suggestions - Get search suggestions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query = '', type = 'all', limit = 10 } = body

    console.log('🔍 Search suggestions request:', { query, type, limit })

    // Get search suggestions using RPC function
    const { data: suggestions, error } = await supabase
      .rpc('get_search_suggestions', {
        search_query: query,
        filter_type: type,
        limit_results: limit
      })

    if (error) {
      console.error('Error getting search suggestions:', error)
      return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 })
    }

    // Group suggestions by type
    const groupedSuggestions = {
      projects: suggestions?.filter(s => s.suggestion_type === 'project') || [],
      tasks: suggestions?.filter(s => s.suggestion_type === 'task') || [],
      users: suggestions?.filter(s => s.suggestion_type === 'user') || [],
      saved_searches: suggestions?.filter(s => s.suggestion_type === 'saved_search') || [],
      filters: suggestions?.filter(s => s.suggestion_type === 'filter') || []
    }

    return NextResponse.json({
      suggestions: suggestions || [],
      grouped_suggestions: groupedSuggestions,
      query,
      type
    })

  } catch (error) {
    console.error('Error in POST /api/client/search/suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
