import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, validateClientAccess } from '@/lib/auth/server';
import { z } from 'zod';

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal').optional(),
});

const updateTeamSchema = createTeamSchema.partial();

// GET /api/client/teams - List teams for the authenticated client
export async function GET(request: NextRequest) {
  try {
    // Validate client access
    const authResult = await validateClientAccess();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile } = authResult;
    const supabase = await createServerSupabaseClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('teams')
      .select(`
        *,
        team_members!inner(
          id,
          user_id,
          role,
          joined_at
        ),
        projects(
          id,
          name,
          status
        )
      `, { count: 'exact' })
      .eq('client_id', profile.client_id);

    // Add search filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: teams, error, count } = await query;

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    // Calculate team member counts
    const teamsWithCounts = teams?.map(team => ({
      ...team,
      member_count: team.team_members?.length || 0,
      project_count: team.projects?.length || 0,
    })) || [];

    return NextResponse.json({
      teams: teamsWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/client/teams:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/client/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    // Validate client access
    const authResult = await validateClientAccess('member');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile } = authResult;
    const supabase = await createServerSupabaseClient();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { name, description, color } = validationResult.data;

    // Check if team name already exists for this client
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('client_id', profile.client_id)
      .eq('name', name)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Já existe um time com este nome' },
        { status: 409 }
      );
    }

    // Create the team
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert([{
        client_id: profile.client_id,
        name,
        description,
        color: color || '#3B82F6', // Default blue color
        created_by: profile.user_id,
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating team:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar time' },
        { status: 500 }
      );
    }

    // Add the creator as team lead
    const { error: memberError } = await supabase
      .from('team_members')
      .insert([{
        team_id: team.id,
        user_id: profile.user_id,
        client_id: profile.client_id,
        role: 'lead',
      }]);

    if (memberError) {
      console.error('Error adding team creator as member:', memberError);
      // Note: We don't return error here as the team was created successfully
    }

    return NextResponse.json(
      { 
        message: 'Time criado com sucesso',
        team 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in POST /api/client/teams:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
