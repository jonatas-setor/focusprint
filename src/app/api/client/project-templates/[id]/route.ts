import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/project-templates/[id] - Get template details with preview
export async function GET(
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

    // Fetch template with detailed information (RLS will handle access control)
    const { data: template, error } = await supabase
      .from('project_templates')
      .select(`
        id,
        name,
        description,
        category,
        template_type,
        template_config,
        is_active,
        created_by,
        client_id,
        team_id,
        source_project_id,
        created_at,
        updated_at
      `)
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      console.error('Error fetching template:', error);
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch columns separately
    const { data: columns } = await supabase
      .from('template_columns')
      .select(`
        id,
        name,
        position,
        color,
        description,
        limit_wip
      `)
      .eq('template_id', templateId)
      .order('position');

    // Fetch tasks separately
    const { data: tasks } = await supabase
      .from('template_tasks')
      .select(`
        id,
        title,
        description,
        position,
        priority,
        estimated_hours,
        tags,
        column_id,
        due_date_offset,
        assigned_to_role
      `)
      .eq('template_id', templateId)
      .order('position');

    // Combine the data
    const templateWithDetails = {
      ...template,
      template_columns: columns || [],
      template_tasks: tasks || []
    };

    // Sort columns by position
    const sortedColumns = templateWithDetails.template_columns.sort((a, b) => a.position - b.position);
    
    // Sort tasks by column and position
    const sortedTasks = templateWithDetails.template_tasks.sort((a, b) => {
      // First sort by column position, then by task position
      const columnA = sortedColumns.find(col => col.id === a.column_id);
      const columnB = sortedColumns.find(col => col.id === b.column_id);
      
      if (columnA && columnB) {
        if (columnA.position !== columnB.position) {
          return columnA.position - columnB.position;
        }
      }
      
      return a.position - b.position;
    });

    // Group tasks by column for preview
    const tasksByColumn = sortedTasks.reduce((acc, task) => {
      const columnId = task.column_id;
      if (!acc[columnId]) {
        acc[columnId] = [];
      }
      acc[columnId].push(task);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate template statistics
    const stats = {
      column_count: sortedColumns.length,
      task_count: sortedTasks.length,
      estimated_total_hours: sortedTasks.reduce(
        (sum, task) => sum + (task.estimated_hours || 0), 
        0
      ),
      tasks_by_priority: sortedTasks.reduce((acc, task) => {
        const priority = task.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      columns_with_limits: sortedColumns.filter(col => col.limit_wip).length
    };

    // Prepare preview data
    const preview = {
      columns: sortedColumns.map(column => ({
        ...column,
        tasks: tasksByColumn[column.id] || [],
        task_count: (tasksByColumn[column.id] || []).length
      })),
      workflow_summary: {
        total_steps: sortedColumns.length,
        estimated_duration: `${Math.ceil(stats.estimated_total_hours / 8)} dias úteis`,
        complexity_level: stats.task_count > 20 ? 'Alta' : stats.task_count > 10 ? 'Média' : 'Baixa'
      }
    };

    // Prepare response
    const templateDetails = {
      ...templateWithDetails,
      template_columns: sortedColumns,
      template_tasks: sortedTasks,
      stats,
      preview,
      usage_tips: generateUsageTips(templateWithDetails.category, stats),
      customization_options: generateCustomizationOptions(templateWithDetails.template_config)
    };

    return NextResponse.json({
      template: templateDetails,
      success: true
    });

  } catch (error) {
    console.error('Unexpected error in project-templates/[id] GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/client/project-templates/[id] - Soft delete a template
export async function DELETE(
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

    console.log('🗑️ [DELETE TEMPLATE] Deleting template:', {
      templateId,
      userId: user.id
    });

    // Soft delete the template (set is_active = false)
    // RLS policies will ensure only the owner can delete their templates
    const { data, error } = await supabase
      .from('project_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('created_by', user.id)
      .eq('is_active', true)
      .select('id, name')
      .single();

    if (error) {
      console.error('Error deleting template:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found or access denied' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    console.log('✅ [DELETE TEMPLATE] Template deleted successfully:', {
      templateId,
      templateName: data.name
    });

    return NextResponse.json({
      message: 'Template deleted successfully',
      template: {
        id: data.id,
        name: data.name
      }
    });

  } catch (error) {
    console.error('Unexpected error in template DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate usage tips based on template category
function generateUsageTips(category: string, stats: any): string[] {
  const baseTips = [
    'Personalize os nomes das colunas conforme seu fluxo de trabalho',
    'Ajuste as estimativas de tempo baseado na sua equipe',
    'Configure limites WIP para otimizar o fluxo de trabalho'
  ];

  const categoryTips: Record<string, string[]> = {
    'software': [
      'Configure integração com repositório Git',
      'Defina critérios de Definition of Done para cada coluna',
      'Use tags para categorizar bugs, features e melhorias'
    ],
    'marketing': [
      'Vincule tarefas aos canais de marketing específicos',
      'Configure aprovações para conteúdo antes da publicação',
      'Monitore métricas de performance de cada campanha'
    ],
    'onboarding': [
      'Personalize o checklist conforme o perfil do cliente',
      'Configure notificações automáticas para prazos críticos',
      'Documente feedback para melhorar o processo'
    ],
    'event': [
      'Configure lembretes para marcos importantes',
      'Mantenha lista de fornecedores e contatos',
      'Documente lições aprendidas para eventos futuros'
    ]
  };

  return [...baseTips, ...(categoryTips[category] || [])];
}

// Helper function to generate customization options
function generateCustomizationOptions(templateConfig: any): any {
  return {
    columns: {
      can_add: true,
      can_remove: true,
      can_reorder: true,
      can_rename: true,
      can_change_colors: true
    },
    tasks: {
      can_modify: true,
      can_delete: true,
      can_add_custom: true,
      can_change_assignments: true
    },
    settings: {
      can_change_priority_levels: true,
      can_modify_due_dates: true,
      can_customize_tags: true,
      can_set_wip_limits: true
    },
    advanced: templateConfig?.advanced_options || {
      automation_rules: false,
      custom_fields: false,
      integration_webhooks: false
    }
  };
}

// PATCH /api/client/project-templates/[id] - Update template (Admin only)
export async function PATCH(
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
    const { name, description, category, template_config, is_active } = body;

    // Update template
    const { data: updatedTemplate, error } = await supabase
      .from('project_templates')
      .update({
        name,
        description,
        category,
        template_config,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template updated successfully',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Unexpected error in project-templates/[id] PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
