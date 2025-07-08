import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for clone template request
const cloneTemplateSchema = z.object({
  name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  template_type: z.enum(['personal', 'team'], {
    errorMap: () => ({ message: 'Tipo de template deve ser "personal" ou "team"' })
  }),
  team_id: z.string().uuid().optional(),
});

// POST /api/client/project-templates/[id]/clone - Clone an existing template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: templateId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client profile
    const { data: clientProfile, error: profileError } = await supabase
      .from('client_profiles')
      .select('id, client_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !clientProfile) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = cloneTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const cloneData = validationResult.data;

    console.log('🔄 [CLONE TEMPLATE] Cloning template:', {
      templateId,
      userId: user.id,
      clientId: clientProfile.client_id,
      cloneData
    });

    // Fetch original template with all details (RLS will handle access control)
    const { data: originalTemplate, error: templateError } = await supabase
      .from('project_templates')
      .select(`
        id,
        name,
        description,
        category,
        template_type,
        template_config,
        is_active
      `)
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (templateError || !originalTemplate) {
      console.error('Error fetching original template:', templateError);
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch template columns
    const { data: originalColumns, error: columnsError } = await supabase
      .from('template_columns')
      .select('*')
      .eq('template_id', templateId)
      .order('position');

    if (columnsError) {
      console.error('Error fetching template columns:', columnsError);
      return NextResponse.json(
        { error: 'Failed to fetch template columns' },
        { status: 500 }
      );
    }

    // Fetch template tasks
    const { data: originalTasks, error: tasksError } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('position');

    if (tasksError) {
      console.error('Error fetching template tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch template tasks' },
        { status: 500 }
      );
    }

    // Prepare data for cloning
    const newTemplateData = {
      name: cloneData.name,
      description: cloneData.description || `Cópia de ${originalTemplate.name}`,
      category: cloneData.category || originalTemplate.category,
      template_type: cloneData.template_type,
      template_config: originalTemplate.template_config || {},
      created_by: user.id,
      client_id: clientProfile.client_id,
      team_id: cloneData.template_type === 'team' ? cloneData.team_id : null
    };

    // Validate team access if creating team template
    if (cloneData.template_type === 'team') {
      if (!cloneData.team_id) {
        return NextResponse.json(
          { error: 'Team ID is required for team templates' },
          { status: 400 }
        );
      }

      const { data: teamAccess, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', cloneData.team_id)
        .eq('client_id', clientProfile.client_id)
        .single();

      if (teamError || !teamAccess) {
        return NextResponse.json(
          { error: 'Access denied to specified team' },
          { status: 403 }
        );
      }
    }

    // Prepare columns data for cloning
    const columnsData = (originalColumns || []).map(column => ({
      name: column.name,
      position: column.position,
      color: column.color,
      description: column.description,
      limit_wip: column.limit_wip
    }));

    // Prepare tasks data for cloning
    const tasksData = (originalTasks || []).map(task => ({
      title: task.title,
      description: task.description,
      position: task.position,
      priority: task.priority,
      estimated_hours: task.estimated_hours,
      tags: task.tags,
      column_id: task.column_id, // This will be remapped by the RPC function
      due_date_offset: task.due_date_offset,
      assigned_to_role: task.assigned_to_role
    }));

    // Call RPC function to create the cloned template
    const { data: newTemplateId, error: createError } = await supabase
      .rpc('create_personal_template', {
        p_name: newTemplateData.name,
        p_description: newTemplateData.description,
        p_category: newTemplateData.category,
        p_template_type: newTemplateData.template_type,
        p_template_config: newTemplateData.template_config,
        p_created_by: newTemplateData.created_by,
        p_client_id: newTemplateData.client_id,
        p_team_id: newTemplateData.team_id,
        p_columns: columnsData,
        p_tasks: tasksData
      });

    if (createError) {
      console.error('Error creating cloned template:', createError);
      return NextResponse.json(
        { error: 'Failed to clone template', details: createError.message },
        { status: 500 }
      );
    }

    console.log('✅ [CLONE TEMPLATE] Template cloned successfully:', {
      originalTemplateId: templateId,
      newTemplateId,
      templateName: cloneData.name,
      templateType: cloneData.template_type
    });

    return NextResponse.json({
      message: 'Template cloned successfully',
      template: {
        id: newTemplateId,
        name: cloneData.name,
        type: cloneData.template_type,
        category: newTemplateData.category,
        original_template_id: templateId
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in clone template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
