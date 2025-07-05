// Test script to verify template functionality
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTemplates() {
  console.log('🧪 Testing Template System...\n');

  try {
    // Test 1: Fetch existing templates
    console.log('1. Fetching existing templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('project_templates')
      .select(`
        id,
        name,
        description,
        category,
        is_active,
        template_columns:template_columns(
          id,
          name,
          position,
          color
        ),
        template_tasks:template_tasks(
          id,
          title,
          description,
          priority,
          estimated_hours
        )
      `);

    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError);
      return;
    }

    console.log(`✅ Found ${templates.length} templates:`);
    templates.forEach(template => {
      console.log(`   - ${template.name} (${template.category})`);
      console.log(`     Columns: ${template.template_columns?.length || 0}`);
      console.log(`     Tasks: ${template.template_tasks?.length || 0}`);
    });

    if (templates.length === 0) {
      console.log('⚠️  No templates found. Creating a test template...');
      await createTestTemplate();
      return;
    }

    // Test 2: Test project creation from template
    const testTemplate = templates[0];
    console.log(`\n2. Testing project creation from template: ${testTemplate.name}`);
    
    const { data: projectId, error: createError } = await supabase
      .rpc('create_project_from_template', {
        p_template_id: testTemplate.id,
        p_project_name: `Test Project from ${testTemplate.name}`,
        p_project_description: 'Test project created from template',
        p_team_id: null,
        p_created_by: 'a0e7994b-0eb8-4c28-9623-8f8501bb1e41' // Real user ID
      });

    if (createError) {
      console.error('❌ Error creating project from template:', createError);
      return;
    }

    console.log(`✅ Project created successfully with ID: ${projectId}`);

    // Test 3: Verify project was created with template data
    console.log('\n3. Verifying project creation...');

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects_with_templates')
      .select('id, name, template_id, template_name')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('❌ Error fetching created project:', projectError);
      return;
    }

    // Get columns for the project
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('id, name, position')
      .eq('project_id', projectId);

    if (columnsError) {
      console.error('❌ Error fetching project columns:', columnsError);
      return;
    }

    // Get tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, column_id')
      .eq('project_id', projectId);

    if (tasksError) {
      console.error('❌ Error fetching project tasks:', tasksError);
      return;
    }

    console.log(`✅ Project verified:`);
    console.log(`   - Name: ${project.name}`);
    console.log(`   - Template ID: ${project.template_id}`);
    console.log(`   - Template Name: ${project.template_name}`);
    console.log(`   - Columns created: ${columns?.length || 0}`);
    console.log(`   - Tasks created: ${tasks?.length || 0}`);

    // Show column details
    if (columns && columns.length > 0) {
      console.log(`   - Column details:`);
      columns.forEach(col => {
        const columnTasks = tasks?.filter(task => task.column_id === col.id) || [];
        console.log(`     * ${col.name} (${columnTasks.length} tasks)`);
      });
    }

    // Test 4: Clean up test project
    console.log('\n4. Cleaning up test project...');
    // Use RPC to delete from client_data schema
    const { error: deleteError } = await supabase
      .rpc('delete_project', { p_project_id: projectId });

    if (deleteError) {
      console.error('❌ Error deleting test project:', deleteError);
    } else {
      console.log('✅ Test project cleaned up successfully');
    }

    console.log('\n🎉 Template system test completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

async function createTestTemplate() {
  console.log('Creating a test template...');
  
  const testColumns = [
    { temp_id: 'col1', name: 'A Fazer', position: 0, color: '#ef4444' },
    { temp_id: 'col2', name: 'Em Progresso', position: 1, color: '#f59e0b' },
    { temp_id: 'col3', name: 'Concluído', position: 2, color: '#10b981' }
  ];

  const testTasks = [
    { 
      column_temp_id: 'col1', 
      title: 'Tarefa de Exemplo 1', 
      description: 'Primeira tarefa do template',
      position: 0, 
      priority: 'medium',
      estimated_hours: 2
    },
    { 
      column_temp_id: 'col2', 
      title: 'Tarefa de Exemplo 2', 
      description: 'Segunda tarefa do template',
      position: 0, 
      priority: 'high',
      estimated_hours: 4
    }
  ];

  const { data: templateId, error } = await supabase
    .rpc('create_template', {
      p_name: 'Template de Teste',
      p_description: 'Template criado automaticamente para testes',
      p_category: 'teste',
      p_template_config: { default_priority: 'medium' },
      p_columns: testColumns,
      p_tasks: testTasks
    });

  if (error) {
    console.error('❌ Error creating test template:', error);
    return;
  }

  console.log(`✅ Test template created with ID: ${templateId}`);
  
  // Now run the main test
  await testTemplates();
}

// Run the test
testTemplates().catch(console.error);
