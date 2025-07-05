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

    // Fetch template with detailed information
    const { data: template, error } = await supabase
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
          description,
          limit_wip
        ),
        template_tasks:template_tasks(
          id,
          title,
          description,
          position,
          priority,
          estimated_hours,
          tags,
          column_id,
          due_date_offset
        )
      `)
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching template details:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template details' },
        { status: 500 }
      );
    }

    // Sort columns by position
    const sortedColumns = template.template_columns?.sort((a, b) => a.position - b.position) || [];
    
    // Sort tasks by column and position
    const sortedTasks = template.template_tasks?.sort((a, b) => {
      // First sort by column position, then by task position
      const columnA = sortedColumns.find(col => col.id === a.column_id);
      const columnB = sortedColumns.find(col => col.id === b.column_id);
      
      if (columnA && columnB) {
        if (columnA.position !== columnB.position) {
          return columnA.position - columnB.position;
        }
      }
      
      return a.position - b.position;
    }) || [];

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
      ...template,
      template_columns: sortedColumns,
      template_tasks: sortedTasks,
      stats,
      preview,
      usage_tips: generateUsageTips(template.category, stats),
      customization_options: generateCustomizationOptions(template.template_config)
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

// DELETE /api/client/project-templates/[id] - Deactivate template (Admin only)
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

    // Soft delete by deactivating template
    const { error } = await supabase
      .from('project_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error deactivating template:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template deactivated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in project-templates/[id] DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
