/**
 * Script para criar administrador de teste
 * 
 * Como usar:
 * 1. Primeiro, registre um usuário manualmente no Supabase Auth com email @focusprint.com
 * 2. Execute este script para criar o perfil admin
 * 
 * node scripts/create-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminProfile() {
  try {
    console.log('🔍 Buscando usuários @focusprint.com...');
    
    // Buscar usuários com email @focusprint.com
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
    }

    // Buscar usuários do domínio @focusprint.com para admin
    const adminUsers = users.users.filter(user =>
      user.email && user.email.endsWith('@focusprint.com')
    );

    if (adminUsers.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado.');
      console.log('📝 Para criar um admin:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá em Authentication > Users');
      console.log('3. Clique em "Add user"');
      console.log('4. Use email: admin@focusprint.com');
      console.log('5. Use uma senha segura');
      console.log('6. Execute este script novamente');
      return;
    }

    console.log(`✅ Encontrados ${adminUsers.length} usuários admin`);

    for (const user of adminUsers) {
      console.log(`\n🔍 Verificando usuário: ${user.email}`);
      
      // Verificar se já tem perfil admin
      const { data: existingProfile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        console.log(`✅ Usuário ${user.email} já possui perfil admin`);
        console.log(`   Nome: ${existingProfile.first_name} ${existingProfile.last_name}`);
        console.log(`   Role: ${existingProfile.role}`);
        continue;
      }

      // Criar perfil admin
      const firstName = user.email.split('@')[0].split('.')[0] || 'Admin';
      const lastName = user.email.split('@')[0].split('.')[1] || 'FocuSprint';

      const { data: newProfile, error: createError } = await supabase
        .from('admin_profiles')
        .insert({
          user_id: user.id,
          first_name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          last_name: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          role: 'admin'
        })
        .select()
        .single();

      if (createError) {
        console.log(`❌ Erro ao criar perfil para ${user.email}: ${createError.message}`);
        continue;
      }

      console.log(`✅ Perfil admin criado para ${user.email}`);
      console.log(`   ID: ${newProfile.id}`);
      console.log(`   Nome: ${newProfile.first_name} ${newProfile.last_name}`);
      console.log(`   Role: ${newProfile.role}`);
    }

    console.log('\n🎉 Script concluído!');
    console.log('🔗 Agora você pode fazer login em: http://localhost:3001/admin/login');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar script
createAdminProfile();
