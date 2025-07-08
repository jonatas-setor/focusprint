// Test script for template creation API
const fetch = require('node-fetch');

async function testTemplateCreation() {
  const url = 'http://localhost:3001/api/client/projects/6de1c041-a894-4b06-a1d7-7a9c200245f8/save-as-template';
  
  const payload = {
    name: 'Template Teste API Direct',
    description: 'Template criado via teste direto da API',
    category: 'Marketing',
    template_type: 'personal',
    include_tasks: true,
    include_attachments: true,
    keep_assignees: false,
    keep_due_dates: false
  };

  try {
    console.log('🚀 Testing template creation API...');
    console.log('URL:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, we'd need proper authentication headers
      },
      body: JSON.stringify(payload)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📊 Response body:', responseText);

    if (response.ok) {
      console.log('✅ Template creation successful!');
    } else {
      console.log('❌ Template creation failed');
    }
  } catch (error) {
    console.error('🚨 Error testing API:', error.message);
  }
}

testTemplateCreation();
