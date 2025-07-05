import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, validateClientAccess } from '@/lib/auth/server';
import { z } from 'zod';

// Validation schemas
const updateTeamSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal').optional(),
});

// GET /api/client/teams/[id] - Get a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate client access
    const authResult = await validateClientAccess();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile, isSuperAdmin } = authResult;
    const supabase = await createServerSupabaseClient();
    const teamId = params.id;

    // Build query for team with members and projects
    let teamQuery = supabase
      .from('teams')
      .select(`
        *,
        team_members(
          id,
          user_id,
          role,
          joined_at,
          client_profiles!inner(
            first_name,
            last_name,
            avatar_url
          )
        ),
        projects(
          id,
          name,
          status,
          priority,
          start_date,
          end_date
        )
      `)
      .eq('id', teamId);

    // If not super admin, filter by client_id
    if (!isSuperAdmin && profile) {
      teamQuery = teamQuery.eq('client_id', profile.client_id);
    }

    const { data: team, error } = await teamQuery.single();

    if (error || !team) {
      return NextResponse.json(
        { error: 'Time não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });

  } catch (error) {
    console.error('Error in GET /api/client/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/client/teams/[id] - Update a team
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate client access
    const authResult = await validateClientAccess('member');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile, isSuperAdmin } = authResult;
    const supabase = await createServerSupabaseClient();
    const teamId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if team exists and belongs to client (if not super admin)
    let teamQuery = supabase
      .from('teams')
      .select('id, name, created_by')
      .eq('id', teamId);

    if (!isSuperAdmin && profile) {
      teamQuery = teamQuery.eq('client_id', profile.client_id);
    }

    const { data: existingTeam, error: fetchError } = await teamQuery.single();

    if (fetchError || !existingTeam) {
      return NextResponse.json(
        { error: 'Time não encontrado' },
        { status: 404 }
      );
    }

    // Check if user has permission to edit
    let canEdit = isSuperAdmin; // Super admin can always edit

    if (!isSuperAdmin && profile) {
      canEdit = profile.role === 'admin' ||
                profile.role === 'owner' ||
                existingTeam.created_by === profile.user_id;
    }

    if (!canEdit) {
      // Check if user is team lead
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', profile.user_id)
        .single();

      if (!teamMember || teamMember.role !== 'lead') {
        return NextResponse.json(
          { error: 'Sem permissão para editar este time' },
          { status: 403 }
        );
      }
    }

    // Check if new name conflicts with existing team (if name is being changed)
    if (updateData.name && updateData.name !== existingTeam.name) {
      const { data: conflictTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('client_id', profile.client_id)
        .eq('name', updateData.name)
        .neq('id', teamId)
        .single();

      if (conflictTeam) {
        return NextResponse.json(
          { error: 'Já existe um time com este nome' },
          { status: 409 }
        );
      }
    }

    // Update the team
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .eq('client_id', profile.client_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar time' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Time atualizado com sucesso',
      team: updatedTeam,
    });

  } catch (error) {
    console.error('Error in PUT /api/client/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/client/teams/[id] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate client access (admin or owner required for deletion)
    const authResult = await validateClientAccess('admin');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile, isSuperAdmin } = authResult;
    const supabase = await createServerSupabaseClient();
    const teamId = params.id;

    // Check if team exists and belongs to client (if not super admin)
    let teamQuery = supabase
      .from('teams')
      .select('id, name, created_by')
      .eq('id', teamId);

    if (!isSuperAdmin && profile) {
      teamQuery = teamQuery.eq('client_id', profile.client_id);
    }

    const { data: team, error: fetchError } = await teamQuery.single();

    if (fetchError || !team) {
      return NextResponse.json(
        { error: 'Time não encontrado' },
        { status: 404 }
      );
    }

    // Check if team has active projects
    const { data: activeProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('team_id', teamId)
      .neq('status', 'archived');

    if (projectsError) {
      console.error('Error checking team projects:', projectsError);
      return NextResponse.json(
        { error: 'Erro ao verificar projetos do time' },
        { status: 500 }
      );
    }

    if (activeProjects && activeProjects.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um time com projetos ativos' },
        { status: 400 }
      );
    }

    // Delete the team (cascade will handle team_members)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('client_id', profile.client_id);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir time' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Time excluído com sucesso',
    });

  } catch (error) {
    console.error('Error in DELETE /api/client/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
