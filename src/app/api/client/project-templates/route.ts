import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const category = searchParams.get('category');
    const active_only = searchParams.get('active_only') !== 'false'; // Default to true

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for template type filtering
    const template_type = searchParams.get('template_type');

    // Use the new RPC function to get accessible templates
    const { data: templates, error } = await supabase
      .rpc('get_user_accessible_templates', {
        p_category: category,
        p_template_type: template_type,
        p_active_only: active_only
      });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // For each template, fetch detailed columns and tasks
    const templatesWithDetails = await Promise.all(
      (templates || []).map(async (template) => {
        // Fetch columns
        const { data: columns } = await supabase
          .from('template_columns')
          .select('id, name, position, color, description, limit_wip')
          .eq('template_id', template.id)
          .order('position');

        // Fetch tasks
        const { data: tasks } = await supabase
          .from('template_tasks')
          .select('id, title, description, position, priority, estimated_hours, tags, column_id, due_date_offset, assigned_to_role')
          .eq('template_id', template.id)
          .order('position');

        return {
          ...template,
          template_columns: columns || [],
          template_tasks: tasks || [],
          stats: {
            column_count: template.column_count,
            task_count: template.task_count,
            estimated_total_hours: (tasks || []).reduce(
              (sum: number, task: any) => sum + (task.estimated_hours || 0),
              0
            )
          }
        };
      })
    );

    return NextResponse.json({
      templates: templatesWithDetails,
      total: templatesWithDetails.length
    });

  } catch (error) {
    console.error('Unexpected error in project-templates GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .schema('platform_admin')
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, category, template_config, columns, tasks } = body;

    // Validate required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Call RPC function to create global template (admin only)
    const { data: templateId, error } = await supabase
      .rpc('create_personal_template', {
        p_name: name,
        p_description: description || null,
        p_category: category,
        p_template_type: 'global',
        p_template_config: template_config || {},
        p_created_by: user.id,
        p_client_id: null,
        p_team_id: null,
        p_columns: columns || [],
        p_tasks: tasks || []
      });

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template created successfully',
      template_id: templateId
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in project-templates POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
