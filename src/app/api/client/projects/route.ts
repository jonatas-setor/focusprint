import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/projects - List user's projects
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log('📋 [PROJECT LIST] Starting project list request');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [PROJECT LIST] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 [PROJECT LIST] User authenticated:', { user_id: user.id });

    // Get user's teams first to filter projects
    const { data: teams, error: teamsError } = await supabase
      .rpc('get_user_teams', { p_user_id: user.id });

    if (teamsError) {
      console.error('❌ [PROJECT LIST] Error fetching teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    const teamIds = teams?.map(team => team.id) || [];
    console.log('👥 [PROJECT LIST] User teams found:', { team_count: teamIds.length, team_ids: teamIds });

    // Get projects for user's teams
    const { data: projects, error: projectsError } = await supabase
      .rpc('get_user_projects', { p_user_id: user.id });

    if (projectsError) {
      console.error('❌ [PROJECT LIST] Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    console.log('✅ [PROJECT LIST] Projects fetched successfully:', {
      project_count: projects?.length || 0,
      projects: projects?.map(p => ({ id: p.id, name: p.name })) || []
    });

    return NextResponse.json({ projects: projects || [] });

  } catch (error) {
    console.error('❌ [PROJECT LIST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { team_id, name, description, priority, start_date, end_date, template_id } = body;

    console.log('🔍 Project creation request:', {
      team_id,
      team_id_type: typeof team_id,
      team_id_length: team_id?.length,
      name,
      description,
      priority,
      template_id
    });

    // Validate required fields
    if (!name) {
      return NextResponse.json({
        error: 'Missing required field: name is required'
      }, { status: 400 });
    }

    // Check project limits based on subscription
    const { data: clientInfo, error: clientError } = await supabase.rpc('get_client_project_limits', {
      p_user_id: user.id
    });

    if (clientError) {
      console.error('Error checking client limits:', clientError);
      return NextResponse.json({ error: 'Failed to validate project limits' }, { status: 500 });
    }

    if (clientInfo && clientInfo.length > 0) {
      const { plan_type, project_count, max_projects } = clientInfo[0];

      if (plan_type === 'free' && project_count >= max_projects) {
        return NextResponse.json({
          error: `Limite de projetos atingido. Usuários gratuitos podem criar até ${max_projects} projetos. Faça upgrade para criar mais projetos.`
        }, { status: 403 });
      }
    }

    // Check if creating from template
    if (template_id) {
      console.log('🎨 [PROJECT CREATE] Creating project from template:', {
        template_id,
        name,
        user_id: user.id,
        team_id: team_id && team_id.trim() !== '' ? team_id : null
      });

      // Create project from template using RPC function
      const { data: projectId, error: templateError } = await supabase.rpc('create_project_from_template', {
        p_template_id: template_id,
        p_project_name: name,
        p_project_description: description || null,
        p_team_id: team_id && team_id.trim() !== '' ? team_id : null,
        p_created_by: user.id
      });

      if (templateError || !projectId) {
        console.error('❌ [PROJECT CREATE] Error creating project from template:', templateError);
        return NextResponse.json({
          error: 'Failed to create project from template',
          details: templateError?.message
        }, { status: 500 });
      }

      // Get the created project details
      const { data: createdProjectData, error: fetchError } = await supabase
        .rpc('get_project_by_id', {
          p_project_id: projectId,
          p_user_id: user.id
        });

      const createdProject = createdProjectData?.[0] || null;

      if (fetchError || !createdProject) {
        console.error('❌ [PROJECT CREATE] Error fetching created project from template:', fetchError);
        return NextResponse.json({
          error: 'Project created from template but failed to fetch details'
        }, { status: 500 });
      }

      console.log('✅ [PROJECT CREATE] Project created from template successfully:', {
        project_id: createdProject.id,
        template_id: template_id
      });

      return NextResponse.json({
        message: 'Projeto criado com sucesso a partir do template',
        project: createdProject,
        template_used: template_id
      }, { status: 201 });
    }

    console.log('🚀 [PROJECT CREATE] Creating project with enhanced defaults:', {
      name,
      user_id: user.id,
      team_id: team_id && team_id.trim() !== '' ? team_id : null
    });

    // Create the project using enhanced RPC function with default content
    const { data: project, error: projectError } = await supabase.rpc('create_project_with_defaults', {
      p_team_id: team_id && team_id.trim() !== '' ? team_id : null,
      p_name: name,
      p_description: description || '',
      p_priority: priority || 'medium',
      p_start_date: start_date || null,
      p_end_date: end_date || null,
      p_created_by: user.id
    });

    if (projectError || !project || project.length === 0) {
      console.error('❌ [PROJECT CREATE] Error creating project with defaults:', projectError);

      // Fallback: Try creating project with basic function and add defaults separately
      console.log('🔄 [PROJECT CREATE] Attempting fallback creation...');

      const { data: basicProject, error: basicError } = await supabase.rpc('create_project', {
        p_team_id: team_id && team_id.trim() !== '' ? team_id : null,
        p_name: name,
        p_description: description || '',
        p_priority: priority || 'medium',
        p_start_date: start_date || null,
        p_end_date: end_date || null,
        p_created_by: user.id
      });

      if (basicError || !basicProject || basicProject.length === 0) {
        console.error('❌ [PROJECT CREATE] Fallback creation also failed:', basicError);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
      }

      const basicProjectData = basicProject[0];
      console.log('✅ [PROJECT CREATE] Basic project created, adding default content...');

      // Add default content to the basic project
      const { data: defaultContent, error: defaultError } = await supabase.rpc('add_default_content_to_project', {
        p_project_id: basicProjectData.id,
        p_user_id: user.id
      });

      if (defaultError || !defaultContent || defaultContent.length === 0) {
        console.error('⚠️ [PROJECT CREATE] Failed to add default content, but project was created:', defaultError);
        // Return the project even if default content failed
        return NextResponse.json({
          message: 'Projeto criado com sucesso (sem conteúdo padrão)',
          project: basicProjectData,
          warning: 'Default content could not be added'
        }, { status: 201 });
      }

      const defaultResult = defaultContent[0];
      console.log('✅ [PROJECT CREATE] Default content added successfully:', {
        columns_created: defaultResult.columns_created,
        tasks_created: defaultResult.tasks_created
      });

      return NextResponse.json({
        message: 'Projeto criado com sucesso',
        project: {
          ...basicProjectData,
          columns_created: defaultResult.columns_created,
          tasks_created: defaultResult.tasks_created
        }
      }, { status: 201 });
    }

    const createdProject = project[0]; // RPC returns array
    console.log('✅ [PROJECT CREATE] Project created with defaults successfully:', {
      project_id: createdProject.id,
      columns_created: createdProject.columns_created,
      tasks_created: createdProject.tasks_created
    });

    return NextResponse.json({
      message: 'Projeto criado com sucesso com conteúdo padrão',
      project: createdProject
    }, { status: 201 });

  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
