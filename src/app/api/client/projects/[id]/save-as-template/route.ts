import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for save as template request
const saveAsTemplateSchema = z.object({
  name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  template_type: z.enum(['personal', 'team'], {
    errorMap: () => ({ message: 'Tipo de template deve ser "personal" ou "team"' })
  }),
  include_tasks: z.boolean().default(true),
  include_task_assignments: z.boolean().default(false),
  include_due_dates: z.boolean().default(false),
  include_attachments: z.boolean().default(true),
});

// POST /api/client/projects/[id]/save-as-template - Save project as template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: projectId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🚨 [SAVE AS TEMPLATE] Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔐 [SAVE AS TEMPLATE] User authenticated:', { userId: user.id, email: user.email });

    // Get user's client profile using the view in public schema
    console.log('📊 [SAVE AS TEMPLATE] Querying client_profiles_view for user:', user.id);
    const { data: clientProfile, error: profileError } = await supabase
      .from('client_profiles_view')
      .select('id, client_id, role')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 [SAVE AS TEMPLATE] Client profile query result:', {
      clientProfile,
      profileError,
      userId: user.id,
      hasProfile: !!clientProfile,
      errorCode: profileError?.code,
      errorMessage: profileError?.message
    });

    if (profileError || !clientProfile) {
      console.error('🚨 [SAVE AS TEMPLATE] Client profile not found:', {
        profileError,
        userId: user.id,
        email: user.email
      });
      return NextResponse.json(
        { error: 'Client profile not found', details: profileError?.message },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = saveAsTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const templateData = validationResult.data;

    console.log('🎨 [SAVE AS TEMPLATE] Creating template from project:', {
      projectId,
      userId: user.id,
      clientId: clientProfile.client_id,
      templateData
    });

    // Fetch project details with columns and tasks
    console.log('📊 [SAVE AS TEMPLATE] Fetching project details for:', projectId);
    const { data: project, error: projectError } = await supabase
      .from('projects_view')
      .select(`
        id,
        name,
        description,
        team_id,
        columns:columns_view(
          id,
          name,
          position,
          color
        ),
        tasks:tasks_view(
          id,
          title,
          description,
          position,
          priority,
          due_date,
          estimated_hours,
          column_id,
          assigned_to,
          task_attachments:task_attachments_view(
            id,
            file_name,
            file_size,
            file_type,
            storage_path
          )
        )
      `)
      .eq('id', projectId)
      .single();

    console.log('📋 [SAVE AS TEMPLATE] Project fetch result:', {
      hasProject: !!project,
      projectName: project?.name,
      columnsCount: project?.columns?.length,
      tasksCount: project?.tasks?.length,
      projectError: projectError?.message
    });

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this project
    if (project.team_id) {
      const { data: teamAccess, error: teamError } = await supabase
        .from('teams_view')
        .select('id, client_id')
        .eq('id', project.team_id)
        .eq('client_id', clientProfile.client_id)
        .single();

      if (teamError || !teamAccess) {
        return NextResponse.json(
          { error: 'Access denied to this project' },
          { status: 403 }
        );
      }
    }

    // Additional validation: Check if user can create the requested template type
    if (templateData.template_type === 'team' && !project.team_id) {
      return NextResponse.json(
        { error: 'Cannot create team template from individual project' },
        { status: 400 }
      );
    }

    // Validate template name uniqueness for the user/client
    const { data: existingTemplate, error: checkError } = await supabase
      .from('project_templates')
      .select('id')
      .eq('name', templateData.name)
      .eq('template_type', templateData.template_type)
      .eq('client_id', clientProfile.client_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking template name uniqueness:', checkError);
      return NextResponse.json(
        { error: 'Failed to validate template name' },
        { status: 500 }
      );
    }

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 409 }
      );
    }

    // Prepare template configuration
    const templateConfig = {
      source_project_id: projectId,
      include_tasks: templateData.include_tasks,
      include_task_assignments: templateData.include_task_assignments,
      include_due_dates: templateData.include_due_dates,
      include_attachments: templateData.include_attachments,
      created_from: 'project_conversion'
    };

    // Prepare columns data
    const columnsData = project.columns?.map(column => ({
      name: column.name,
      position: column.position,
      color: column.color,
      description: column.description,
      limit_wip: column.limit_wip
    })) || [];

    // Prepare tasks data (if included)
    let tasksData: any[] = [];
    if (templateData.include_tasks && project.tasks) {
      tasksData = project.tasks.map(task => {
        const taskData: any = {
          title: task.title,
          description: task.description,
          position: task.position,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          tags: task.tags,
          column_id: task.column_id
        };

        // Include due date offset if requested
        if (templateData.include_due_dates && task.due_date) {
          // Calculate offset from project start (for now, use creation date)
          // This would be improved with actual project start date
          taskData.due_date_offset = 0; // Placeholder
        }

        // Include assignment if requested
        if (templateData.include_task_assignments && task.assigned_to) {
          taskData.assigned_to = task.assigned_to;
        }

        return taskData;
      });
    }

    // Determine template ownership based on type
    let createdBy = user.id;
    let clientId = clientProfile.client_id;
    let teamId = null;

    if (templateData.template_type === 'team' && project.team_id) {
      // Check if user is team leader or has permission to create team templates
      const { data: teamInfo, error: teamInfoError } = await supabase
        .from('teams_view')
        .select('leader_id')
        .eq('id', project.team_id)
        .single();

      if (teamInfoError || !teamInfo) {
        return NextResponse.json(
          { error: 'Team information not found' },
          { status: 404 }
        );
      }

      // For now, allow any team member to create team templates
      // In the future, you might want to restrict this to team leaders only
      teamId = project.team_id;
    }

    // Call RPC function to create template
    console.log('🚀 [SAVE AS TEMPLATE] Calling create_personal_template RPC with params:', {
      p_name: templateData.name,
      p_description: templateData.description || null,
      p_category: templateData.category,
      p_template_type: templateData.template_type,
      p_created_by: createdBy,
      p_client_id: clientId,
      p_team_id: teamId,
      columnsCount: columnsData.length,
      tasksCount: tasksData.length
    });

    const { data: templateId, error: createError } = await supabase
      .rpc('create_personal_template', {
        p_name: templateData.name,
        p_description: templateData.description || null,
        p_category: templateData.category,
        p_template_type: templateData.template_type,
        p_template_config: templateConfig,
        p_created_by: createdBy,
        p_client_id: clientId,
        p_team_id: teamId,
        p_columns: columnsData,
        p_tasks: tasksData
      });

    console.log('✅ [SAVE AS TEMPLATE] RPC call result:', {
      templateId,
      createError: createError?.message,
      success: !createError && !!templateId
    });

    if (createError) {
      console.error('Error creating template:', createError);
      return NextResponse.json(
        { error: 'Failed to create template', details: createError.message },
        { status: 500 }
      );
    }

    console.log('✅ [SAVE AS TEMPLATE] Template created successfully:', {
      templateId,
      templateName: templateData.name,
      templateType: templateData.template_type
    });

    return NextResponse.json({
      message: 'Template created successfully',
      template: {
        id: templateId,
        name: templateData.name,
        type: templateData.template_type,
        category: templateData.category
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in save-as-template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
