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

    // Build query
    let query = supabase
      .from('project_templates')
      .select(`
        id,
        name,
        description,
        category,
        template_config,
        is_active,
        created_at,
        updated_at,
        template_columns:template_columns(
          id,
          name,
          position,
          color,
          description
        ),
        template_tasks:template_tasks(
          id,
          title,
          description,
          position,
          priority,
          estimated_hours,
          tags,
          column_id
        )
      `)
      .order('category')
      .order('name');

    // Apply filters
    if (active_only) {
      query = query.eq('is_active', true);
    }
    
    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Transform data to include task counts and column counts
    const templatesWithStats = templates?.map(template => ({
      ...template,
      stats: {
        column_count: template.template_columns?.length || 0,
        task_count: template.template_tasks?.length || 0,
        estimated_total_hours: template.template_tasks?.reduce(
          (sum: number, task: any) => sum + (task.estimated_hours || 0), 
          0
        ) || 0
      }
    }));

    return NextResponse.json({
      templates: templatesWithStats,
      total: templatesWithStats?.length || 0
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

    // Call RPC function to create template
    const { data: templateId, error } = await supabase
      .rpc('create_template', {
        p_name: name,
        p_description: description || null,
        p_category: category,
        p_template_config: template_config || {},
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
